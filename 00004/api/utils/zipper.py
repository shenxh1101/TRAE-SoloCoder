import os
import zipfile
import io

def create_zip_package(results, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        folk_content = []
        ancient_content = []
        cyberpunk_content = []
        all_content = []

        for idx, result in enumerate(results, 1):
            line = result['line']
            folk_text = result['folk']['text'] if isinstance(result['folk'], dict) else result['folk']
            ancient_text = result['ancient']['text'] if isinstance(result['ancient'], dict) else result['ancient']
            cyberpunk_text = result['cyberpunk']['text'] if isinstance(result['cyberpunk'], dict) else result['cyberpunk']
            
            folk_content.append(f'=== 第 {idx} 行 ===')
            folk_content.append(f'原文: {line}')
            folk_content.append(f'民谣风:\n{folk_text}\n')
            
            ancient_content.append(f'=== 第 {idx} 行 ===')
            ancient_content.append(f'原文: {line}')
            ancient_content.append(f'古风:\n{ancient_text}\n')
            
            cyberpunk_content.append(f'=== 第 {idx} 行 ===')
            cyberpunk_content.append(f'原文: {line}')
            cyberpunk_content.append(f'赛博朋克风:\n{cyberpunk_text}\n')
            
            all_content.append(f'=== 第 {idx} 行 ===')
            all_content.append(f'原文: {line}')
            all_content.append(f'民谣风:\n{folk_text}\n')
            all_content.append(f'古风:\n{ancient_text}\n')
            all_content.append(f'赛博朋克风:\n{cyberpunk_text}\n')
            all_content.append('-' * 50 + '\n')

        zf.writestr('民谣风.txt', '\n'.join(folk_content))
        zf.writestr('古风.txt', '\n'.join(ancient_content))
        zf.writestr('赛博朋克风.txt', '\n'.join(cyberpunk_content))
        zf.writestr('全部风格合集.txt', '\n'.join(all_content))

    return output_path
