from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:5174")
    page.wait_for_timeout(3000)

    # Instead of role button, grab it by class since it's an aria-label maybe? Or just test
    page.screenshot(path="/home/jules/verification/screenshots/nav_debug.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
