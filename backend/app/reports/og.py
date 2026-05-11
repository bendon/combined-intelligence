"""
Build pre-rendered Open Graph HTML for social crawlers.
Called by the bot-detection middleware in main.py.
"""
from app.config import get_settings

settings = get_settings()

_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{description}" />

  <!-- Open Graph -->
  <meta property="og:type"        content="article" />
  <meta property="og:site_name"   content="Combined Intelligence" />
  <meta property="og:url"         content="{url}" />
  <meta property="og:title"       content="{title}" />
  <meta property="og:description" content="{description}" />
  <meta property="og:image"       content="{image}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter / X Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@combinedintel" />
  <meta name="twitter:title"       content="{title}" />
  <meta name="twitter:description" content="{description}" />
  <meta name="twitter:image"       content="{image}" />

  <!-- Article metadata -->
  <meta property="article:published_time" content="{date}" />
  <meta property="article:author"         content="{author}" />
  <meta property="article:tag"            content="{tag}" />

  <!-- Redirect real users to the SPA -->
  <script>
    if (!/bot|crawl|spider|preview|fetch|curl|wget/i.test(navigator.userAgent)) {{
      window.location.replace("{url}");
    }}
  </script>
</head>
<body>
  <h1>{title}</h1>
  <p>{description}</p>
  <p><a href="{url}">Read the full report →</a></p>
</body>
</html>
"""

_FALLBACK_IMAGE = f"{settings.base_url}/og-default.jpg"


def build_og_html(doc: dict) -> str:
    slug = doc.get("slug", "")
    title = doc.get("title", "Combined Intelligence Report")
    subtitle = doc.get("subtitle", "")
    hook = doc.get("hook", "")
    description = hook or subtitle or f"Strategic analysis from Combined Intelligence."
    # Truncate description for OG spec (≤ 200 chars)
    if len(description) > 200:
        description = description[:197] + "…"

    image = doc.get("og_image_url") or _FALLBACK_IMAGE
    url = f"{settings.base_url}/reports/{slug}"
    date = doc.get("date", "")
    author = doc.get("author", "Combined Intelligence Desk")
    tag = doc.get("tag", "Analysis")

    return _TEMPLATE.format(
        title=_esc(title),
        description=_esc(description),
        image=image,
        url=url,
        date=date,
        author=_esc(author),
        tag=_esc(tag),
    )


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")
