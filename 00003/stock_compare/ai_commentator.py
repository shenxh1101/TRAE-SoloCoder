import os
import json
import time
import hashlib
import socket
from typing import Dict, Optional
from urllib import request, error as urlerror


class AICommentator:
    CONFIG = {
        "api_type": os.getenv("STOCK_AI_API_TYPE", "ollama"),
        "api_base": os.getenv("STOCK_AI_API_BASE", "http://localhost:11434"),
        "api_key": os.getenv("STOCK_AI_API_KEY", ""),
        "model": os.getenv("STOCK_AI_MODEL", "qwen2:7b"),
        "timeout": int(os.getenv("STOCK_AI_TIMEOUT", "30")),
        "max_retries": int(os.getenv("STOCK_AI_MAX_RETRIES", "2")),
        "retry_delay": int(os.getenv("STOCK_AI_RETRY_DELAY", "2")),
        "fallback_to_template": os.getenv("STOCK_AI_FALLBACK", "true").lower() == "true"
    }

    FALLBACK_RISK_TEMPLATES = [
        "短期波动加剧，需警惕回调风险",
        "量能不足，上涨动能存疑",
        "估值偏高，短期承压概率较大",
        "技术面出现背离信号，关注量价配合",
        "市场情绪偏弱，短期或延续震荡",
        "上方压力明显，突破需成交量配合",
        "短期超买，存在技术性回调需求",
        "资金流向不明确，观望情绪浓厚"
    ]

    FALLBACK_OPPORTUNITY_TEMPLATES = [
        "技术形态向好，短期有望继续上攻",
        "估值具备吸引力，中长期配置价值凸显",
        "量价配合良好，上涨趋势延续",
        "资金持续流入，短期或有表现机会",
        "基本面稳健，回调即是布局良机",
        "突破关键压力位，打开上涨空间",
        "市场关注度提升，短期催化因素增多",
        "业绩预期向好，估值有望修复"
    ]

    FALLBACK_SUMMARIES = [
        "综合来看，{winner} 短期表现更具韧性，但 {loser} 的估值修复行情亦值得关注。建议关注成交量变化，灵活调整仓位。",
        "{winner} 走势强劲，但需警惕追高风险；{loser} 虽短期承压，但估值安全边际较高。可考虑均衡配置。",
        "{winner} 资金关注度提升，短期趋势明确；{loser} 处于磨底阶段，耐心等待信号。激进投资者可关注 {winner} 的交易性机会。",
        "{winner} 技术面占优，{loser} 基本面有支撑。两者各有千秋，根据风险偏好选择配置方向。",
        "从对比数据看，{winner} 短期动量更强，{loser} 估值更具吸引力。建议以时间换空间，分批布局优质标的。",
        "{winner} 短期机会大于风险，{loser} 或面临震荡整理。操作上，{winner} 可持有，{loser} 等待明确信号。"
    ]

    @staticmethod
    def _build_prompt(comparison_data: Dict) -> str:
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        code1, code2 = s1["code"], s2["code"]
        period = comparison_data["period_days"]
        winner = comparison_data.get("winner")

        def format_stock_data(s: Dict) -> str:
            pe = s.get("pe") or {}
            lines = [
                f"  区间涨跌幅: {s.get('change_percent', 'N/A')}%",
                f"  起始价格: {s.get('start_price', 'N/A')}",
                f"  最新价格: {s.get('end_price', 'N/A')}",
                f"  波动率: {s.get('volatility', 'N/A')}%",
                f"  最大回撤: {s.get('max_drawdown', 'N/A')}%"
            ]
            if pe:
                lines.extend([
                    f"  当前PE: {pe.get('current_pe', 'N/A')}",
                    f"  PE分位点: {pe.get('percentile', 'N/A')}%",
                    f"  估值水平: {pe.get('valuation', 'N/A')}"
                ])
            return "\n".join(lines)

        prompt = f"""你是一位专业的股票分析师，请基于以下两只股票的对比数据，给出有深度的分析评论。

对比周期: {period}个交易日
胜出股票: {winner or '两者表现接近'}

股票 {code1} 数据:
{format_stock_data(s1)}

股票 {code2} 数据:
{format_stock_data(s2)}

请按以下JSON格式输出分析结果（只输出JSON，不要有其他文字）:
{{
    "stock1_risk": "针对股票{code1}的风险提示，结合具体数据分析，不超过80字",
    "stock1_opportunity": "针对股票{code1}的机会展望，结合具体数据分析，不超过80字",
    "stock2_risk": "针对股票{code2}的风险提示，结合具体数据分析，不超过80字",
    "stock2_opportunity": "针对股票{code2}的机会展望，结合具体数据分析，不超过80字",
    "summary": "综合对比两只股票，给出投资建议，不超过150字"
}}

要求:
1. 风险分析要关注波动率、回撤幅度、估值水平等负面指标
2. 机会分析要关注涨幅、低估程度等正面指标
3. 对比要客观，既要讲优势也要讲风险
4. 语言要专业但不晦涩，适合普通投资者理解
5. 所有分析必须基于提供的数据，不要编造数据
"""
        return prompt

    @staticmethod
    def _handle_http_error(e: urlerror.HTTPError, api_type: str) -> str:
        error_messages = {
            400: "请求参数错误，请检查API配置",
            401: "认证失败，请检查API密钥是否正确",
            403: "访问被拒绝，请检查API权限",
            404: "API地址不存在，请检查API_BASE配置",
            429: "请求过于频繁，请稍后再试",
            500: "服务器内部错误",
            502: "网关错误，服务暂时不可用",
            503: "服务不可用，请稍后再试",
            504: "网关超时，请稍后再试"
        }
        base_msg = error_messages.get(e.code, f"HTTP错误 {e.code}")
        try:
            error_body = e.read().decode("utf-8", errors="ignore")
            if error_body:
                try:
                    error_json = json.loads(error_body)
                    if "error" in error_json:
                        if isinstance(error_json["error"], dict):
                            detail = error_json["error"].get("message", str(error_json["error"]))
                        else:
                            detail = str(error_json["error"])
                        return f"{base_msg}: {detail}"
                except json.JSONDecodeError:
                    if len(error_body) < 200:
                        return f"{base_msg}: {error_body[:200]}"
        except Exception:
            pass
        return base_msg

    @staticmethod
    def _call_with_retry(api_func) -> Optional[str]:
        max_retries = AICommentator.CONFIG["max_retries"]
        retry_delay = AICommentator.CONFIG["retry_delay"]
        
        for attempt in range(max_retries + 1):
            try:
                result = api_func()
                if result is not None:
                    return result
            except urlerror.HTTPError as e:
                error_msg = AICommentator._handle_http_error(e, "api")
                if e.code in [500, 502, 503, 504, 429] and attempt < max_retries:
                    print(f"⚠️  {error_msg}，{retry_delay}秒后重试 ({attempt + 1}/{max_retries + 1})...")
                    time.sleep(retry_delay)
                    continue
                else:
                    print(f"❌ {error_msg}")
                    return None
            except (urlerror.URLError, socket.timeout, ConnectionError) as e:
                if isinstance(e, socket.timeout):
                    error_msg = f"请求超时 ({AICommentator.CONFIG['timeout']}秒)"
                elif isinstance(e, urlerror.URLError):
                    reason = e.reason
                    if isinstance(reason, socket.timeout):
                        error_msg = f"请求超时 ({AICommentator.CONFIG['timeout']}秒)"
                    elif isinstance(reason, ConnectionRefusedError):
                        error_msg = "连接被拒绝，请检查服务是否启动"
                    else:
                        error_msg = f"网络错误: {reason}"
                else:
                    error_msg = f"连接错误: {e}"
                
                if attempt < max_retries:
                    print(f"⚠️  {error_msg}，{retry_delay}秒后重试 ({attempt + 1}/{max_retries + 1})...")
                    time.sleep(retry_delay)
                    continue
                else:
                    print(f"❌ {error_msg}")
                    return None
            except json.JSONDecodeError as e:
                print(f"❌ 响应解析失败: 返回数据不是有效的JSON格式")
                return None
            except Exception as e:
                print(f"❌ 未知错误: {type(e).__name__}: {e}")
                return None
        
        return None

    @staticmethod
    def _call_ollama(prompt: str) -> Optional[str]:
        config = AICommentator.CONFIG
        url = f"{config['api_base']}/api/generate"
        payload = json.dumps({
            "model": config["model"],
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 500
            }
        }).encode("utf-8")

        req = request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        def do_request():
            with request.urlopen(req, timeout=config["timeout"]) as resp:
                status_code = resp.getcode()
                if status_code != 200:
                    raise urlerror.HTTPError(
                        url, status_code, f"Unexpected status code {status_code}",
                        resp.headers, resp
                    )
                
                raw_data = resp.read()
                if not raw_data:
                    print("❌ 响应为空")
                    return None
                
                try:
                    text_data = raw_data.decode("utf-8")
                except UnicodeDecodeError:
                    print("❌ 响应编码错误，无法解析为UTF-8")
                    return None
                
                try:
                    data = json.loads(text_data)
                except json.JSONDecodeError:
                    if len(text_data) < 500:
                        print(f"❌ 响应不是JSON: {text_data[:500]}...")
                    else:
                        print(f"❌ 响应不是JSON，长度: {len(text_data)}")
                    return None
                
                if not isinstance(data, dict):
                    print(f"❌ 响应格式错误，期望JSON对象，得到{type(data)}")
                    return None
                
                if "error" in data:
                    print(f"❌ API返回错误: {data['error']}")
                    return None
                
                response_text = data.get("response")
                if response_text is None:
                    print("❌ 响应缺少'response'字段")
                    print(f"可用字段: {list(data.keys())}")
                    return None
                
                if not response_text.strip():
                    print("❌ 响应内容为空")
                    return None
                
                return response_text

        return AICommentator._call_with_retry(do_request)

    @staticmethod
    def _call_openai_compatible(prompt: str) -> Optional[str]:
        config = AICommentator.CONFIG
        url = f"{config['api_base']}/chat/completions"
        payload = json.dumps({
            "model": config["model"],
            "messages": [
                {"role": "system", "content": "你是一位专业的股票分析师，擅长根据数据进行客观分析。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}"
        }

        req = request.Request(
            url,
            data=payload,
            headers=headers,
            method="POST"
        )

        def do_request():
            with request.urlopen(req, timeout=config["timeout"]) as resp:
                status_code = resp.getcode()
                if status_code != 200:
                    raise urlerror.HTTPError(
                        url, status_code, f"Unexpected status code {status_code}",
                        resp.headers, resp
                    )
                
                raw_data = resp.read()
                if not raw_data:
                    print("❌ 响应为空")
                    return None
                
                try:
                    text_data = raw_data.decode("utf-8")
                except UnicodeDecodeError:
                    print("❌ 响应编码错误，无法解析为UTF-8")
                    return None
                
                try:
                    data = json.loads(text_data)
                except json.JSONDecodeError:
                    if len(text_data) < 500:
                        print(f"❌ 响应不是JSON: {text_data[:500]}...")
                    else:
                        print(f"❌ 响应不是JSON，长度: {len(text_data)}")
                    return None
                
                if not isinstance(data, dict):
                    print(f"❌ 响应格式错误，期望JSON对象，得到{type(data)}")
                    return None
                
                if "error" in data:
                    err = data["error"]
                    if isinstance(err, dict):
                        print(f"❌ API返回错误: {err.get('message', str(err))}")
                    else:
                        print(f"❌ API返回错误: {err}")
                    return None
                
                choices = data.get("choices")
                if not choices or not isinstance(choices, list) or len(choices) == 0:
                    print("❌ 响应缺少有效choices")
                    print(f"可用字段: {list(data.keys())}")
                    return None
                
                message = choices[0].get("message")
                if not message:
                    print("❌ 响应缺少message字段")
                    return None
                
                content = message.get("content")
                if content is None:
                    print("❌ 响应缺少content字段")
                    return None
                
                if not content.strip():
                    print("❌ 响应内容为空")
                    return None
                
                return content

        return AICommentator._call_with_retry(do_request)

    @staticmethod
    def _parse_ai_response(response: str, comparison_data: Dict) -> Optional[Dict]:
        if not response or not response.strip():
            print("❌ AI响应为空")
            return None
        
        response_stripped = response.strip()
        start = response_stripped.find("{")
        end = response_stripped.rfind("}") + 1
        
        if start < 0 or end <= start:
            print("❌ 无法在响应中找到JSON对象")
            if len(response_stripped) < 300:
                print(f"响应内容: {response_stripped}")
            return None
        
        json_str = response_stripped[start:end]
        
        try:
            parsed = json.loads(json_str)
        except json.JSONDecodeError as e:
            print(f"❌ JSON解析失败: {e}")
            if len(json_str) < 500:
                print(f"JSON内容: {json_str}")
            return None
        
        if not isinstance(parsed, dict):
            print(f"❌ 解析结果不是字典，是{type(parsed)}")
            return None
        
        required_keys = ["stock1_risk", "stock1_opportunity", 
                       "stock2_risk", "stock2_opportunity", "summary"]
        
        missing_keys = [k for k in required_keys if k not in parsed]
        if missing_keys:
            print(f"❌ 响应缺少必要字段: {', '.join(missing_keys)}")
            print(f"可用字段: {list(parsed.keys())}")
            return None
        
        for key in required_keys:
            value = parsed[key]
            if not isinstance(value, str):
                print(f"⚠️  字段 {key} 不是字符串，已自动转换")
                parsed[key] = str(value) if value is not None else ""
        
        for key in required_keys:
            if not parsed[key].strip():
                print(f"⚠️  字段 {key} 内容为空，将使用通用描述")
                parsed[key] = AICommentator._get_fallback_field(key, comparison_data)
        
        return parsed

    @staticmethod
    def _get_fallback_field(field_name: str, comparison_data: Dict) -> str:
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        code1, code2 = s1["code"], s2["code"]
        winner = comparison_data.get("winner")
        
        seed = hashlib.md5(f"{code1}_{code2}_{field_name}".encode()).hexdigest()
        rand_idx = int(seed, 16)
        
        if field_name == "stock1_risk":
            return AICommentator._get_fallback_risk(s1, rand_idx)
        elif field_name == "stock1_opportunity":
            return AICommentator._get_fallback_opportunity(s1, rand_idx)
        elif field_name == "stock2_risk":
            return AICommentator._get_fallback_risk(s2, rand_idx)
        elif field_name == "stock2_opportunity":
            return AICommentator._get_fallback_opportunity(s2, rand_idx)
        elif field_name == "summary":
            return AICommentator._get_fallback_summary(winner, code1, code2, rand_idx)
        else:
            return ""

    @staticmethod
    def _generate_fallback(comparison_data: Dict) -> Dict:
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        code1, code2 = s1["code"], s2["code"]
        winner = comparison_data.get("winner")

        seed = hashlib.md5(f"{code1}_{code2}_{comparison_data['period_days']}".encode()).hexdigest()
        rand_idx = int(seed, 16)

        risk1 = AICommentator._get_fallback_risk(s1, rand_idx % 1000)
        risk2 = AICommentator._get_fallback_risk(s2, rand_idx % 2000 + 100)
        
        opp1 = AICommentator._get_fallback_opportunity(s1, rand_idx % 3000 + 200)
        opp2 = AICommentator._get_fallback_opportunity(s2, rand_idx % 4000 + 300)

        summary = AICommentator._get_fallback_summary(winner, code1, code2, rand_idx)

        return {
            "stock1_risk": risk1,
            "stock1_opportunity": opp1,
            "stock2_risk": risk2,
            "stock2_opportunity": opp2,
            "summary": summary,
            "_fallback": True
        }

    @staticmethod
    def _get_fallback_risk(stock_data: Dict, seed: int) -> str:
        idx = seed % len(AICommentator.FALLBACK_RISK_TEMPLATES)
        base = AICommentator.FALLBACK_RISK_TEMPLATES[idx]
        
        vol = stock_data.get("volatility")
        dd = stock_data.get("max_drawdown")
        pe = stock_data.get("pe") or {}
        
        factors = []
        if vol and vol > 3:
            factors.append(f"波动率{vol}%偏高")
        if dd and dd < -5:
            factors.append(f"最大回撤{dd}%")
        if pe and pe.get("percentile", 50) > 70:
            factors.append(f"PE分位点{pe['percentile']}%处于高估区间")
        
        if factors:
            return f"{base}。风险因素：{'、'.join(factors)}。"
        return base + "。"

    @staticmethod
    def _get_fallback_opportunity(stock_data: Dict, seed: int) -> str:
        idx = seed % len(AICommentator.FALLBACK_OPPORTUNITY_TEMPLATES)
        base = AICommentator.FALLBACK_OPPORTUNITY_TEMPLATES[idx]
        
        change = stock_data.get("change_percent", 0) or 0
        pe = stock_data.get("pe") or {}
        
        positives = []
        if change > 0:
            positives.append(f"区间涨幅{change}%")
        if pe and pe.get("percentile", 50) < 40:
            positives.append(f"PE分位点{pe['percentile']}%处于低估区间")
        
        if positives:
            return f"{base}。积极信号：{'、'.join(positives)}。"
        return base + "。"

    @staticmethod
    def _get_fallback_summary(winner: Optional[str], code1: str, code2: str, seed: int) -> str:
        idx = seed % len(AICommentator.FALLBACK_SUMMARIES)
        template = AICommentator.FALLBACK_SUMMARIES[idx]
        
        if winner == code1:
            return template.format(winner=code1, loser=code2)
        elif winner == code2:
            return template.format(winner=code2, loser=code1)
        else:
            return f"综合来看，{code1} 与 {code2} 近期表现旗鼓相当。建议结合基本面深入分析，关注后续走势分化机会。"

    @staticmethod
    def generate_comment(comparison_data: Dict) -> Dict:
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        code1, code2 = s1["code"], s2["code"]

        api_type = AICommentator.CONFIG["api_type"].lower()
        prompt = AICommentator._build_prompt(comparison_data)

        ai_result = None
        used_api = None

        if api_type != "template":
            print(f"🤖 正在调用AI模型 ({api_type}: {AICommentator.CONFIG['model']})...")
            
            try:
                if api_type == "ollama":
                    ai_response = AICommentator._call_ollama(prompt)
                    used_api = "ollama"
                elif api_type in ["openai", "compatible"]:
                    ai_response = AICommentator._call_openai_compatible(prompt)
                    used_api = api_type
                else:
                    print(f"⚠️  未知的API类型: {api_type}，使用模板模式")
                    ai_response = None

                if ai_response:
                    print("🔍 解析AI响应...")
                    ai_result = AICommentator._parse_ai_response(ai_response, comparison_data)
                    if ai_result:
                        print("✅ AI分析完成")
            except Exception as e:
                print(f"❌ AI调用异常: {type(e).__name__}: {e}")
                ai_result = None

        if ai_result is None and AICommentator.CONFIG["fallback_to_template"]:
            if used_api:
                print("⚠️  AI调用失败，使用模板降级")
            ai_result = AICommentator._generate_fallback(comparison_data)
            used_api = "template"

        if ai_result is None:
            print("❌ 无法获取分析结果，使用空模板")
            ai_result = AICommentator._generate_fallback(comparison_data)
            used_api = "template"

        return {
            "stock1": {
                "code": code1,
                "risk": ai_result["stock1_risk"],
                "opportunity": ai_result["stock1_opportunity"]
            },
            "stock2": {
                "code": code2,
                "risk": ai_result["stock2_risk"],
                "opportunity": ai_result["stock2_opportunity"]
            },
            "summary": ai_result["summary"],
            "disclaimer": "【免责声明】本评论仅供参考，不构成投资建议。股市有风险，投资需谨慎。",
            "meta": {
                "api_type": used_api,
                "model": AICommentator.CONFIG["model"] if used_api != "template" else None,
                "fallback": used_api == "template"
            }
        }

    @staticmethod
    def get_quick_tip(comparison_data: Dict) -> str:
        s1 = comparison_data["stock1"]
        s2 = comparison_data["stock2"]
        winner = comparison_data.get("winner")
        
        change1 = s1.get("change_percent", 0) or 0
        change2 = s2.get("change_percent", 0) or 0
        
        if winner:
            diff = abs(change1 - change2)
            if diff > 5:
                return f"💡 {winner} 近期强势领涨，领先优势达{diff:.1f}%"
            elif diff > 2:
                return f"💡 {winner} 小幅领先，关注持续性"
            else:
                return "💡 两者走势接近，建议观望等待信号"
        else:
            return "💡 两者表现持平，关注后续方向选择"

    @staticmethod
    def print_config():
        print("\n🤖 AI评论器配置:")
        print(f"  API类型: {AICommentator.CONFIG['api_type']}")
        if AICommentator.CONFIG['api_type'] != "template":
            print(f"  API地址: {AICommentator.CONFIG['api_base']}")
            print(f"  模型: {AICommentator.CONFIG['model']}")
            print(f"  超时: {AICommentator.CONFIG['timeout']}秒")
            print(f"  最大重试: {AICommentator.CONFIG['max_retries']}次")
            print(f"  重试间隔: {AICommentator.CONFIG['retry_delay']}秒")
            print(f"  降级到模板: {'是' if AICommentator.CONFIG['fallback_to_template'] else '否'}")
        print()
