from countdown.phrases import (
    get_random_phrase,
    get_random_combination,
    get_all_styles,
    PHRASES,
)
import random


def generate_copy(
    days: int,
    style: str,
    product_name: str = "",
    keywords: list = None,
) -> str:
    if keywords and len(keywords) >= 3:
        return _generate_with_keywords(days, style, product_name, keywords[:3])
    return _generate_without_keywords(days, style, product_name)


def _generate_without_keywords(days: int, style: str, product_name: str) -> str:
    date_phrase = get_random_phrase(style, "date_phrases").format(days=days)
    opening = get_random_phrase(style, "openings")
    transition = get_random_phrase(style, "transitions")
    closing = get_random_phrase(style, "closings")

    combinators = [
        "{date}，{opening}",
        "{date}——{transition}",
        "{date}，{closing}",
        "{date}：{closing}",
        "{opening}，{date}",
        "{date}，{opening}，{closing}",
        "{date}，{transition}，{closing}",
        "{date}|{opening}·{closing}",
        "{transition}，{date}",
        "{date}：{opening}",
    ]

    combinator = random.choice(combinators)
    result = combinator.format(date=date_phrase, opening=opening, transition=transition, closing=closing)

    if product_name:
        result = f"【{product_name}】{result}"

    return result


def _generate_with_keywords(
    days: int,
    style: str, product_name: str, keywords: list
) -> str:
    templates = PHRASES.get(style, {}).get("keyword_templates", [])
    if not templates:
        return _generate_without_keywords(days, style, product_name)

    template = random.choice(templates)

    kw1, kw2, kw3 = keywords[0], keywords[1], keywords[2]

    result = template.format(
        days=days,
        kw1=kw1,
        kw2=kw2,
        kw3=kw3,
    )

    if product_name:
        result = f"【{product_name}】{result}"

    return result


def generate_batch(
    launch_date_str: str,
    style: str,
    product_name: str = "",
    keywords: list = None,
    days_ahead: int = 10,
) -> list:
    from datetime import datetime, timedelta

    launch_date = datetime.strptime(launch_date_str, "%Y-%m-%d").date()
    today = datetime.now().date()
    results = []

    for i in range(days_ahead):
        target_date = today + timedelta(days=i)
        days_remaining = (launch_date - target_date).days

        if days_remaining < 0:
            break

        copy = generate_copy(days_remaining, style, product_name, keywords)
        results.append(
            {
                "date": target_date.strftime("%Y-%m-%d"),
                "days_remaining": days_remaining,
                "style": style,
                "copy": copy,
            }
        )

    return results


def generate_all_styles(
    launch_date_str: str,
    product_name: str = "",
    keywords: list = None,
    days_ahead: int = 10,
) -> dict:
    all_results = {}
    for style in get_all_styles():
        all_results[style] = generate_batch(
            launch_date_str, style, product_name, keywords, days_ahead
        )
    return all_results
