const API_KEY = "YDCfBo2LambljGLKhiG4hybf4GeeAHT3";
const API_URL = "https://api.giphy.com/v1/gifs";
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const grid = document.getElementById("grid");
const title = document.getElementById("title");
const kicker = document.getElementById("kicker");
const count = document.getElementById("count");
const message = document.getElementById("message");
const loading = document.getElementById("loading");
const loadMore = document.getElementById("loadMore");
const sentinel = document.getElementById("sentinel");
const toast = document.getElementById("toast");
const toastText = document.getElementById("toastText");
const LIMIT = 12;
let currentQuery = "";
let currentOffset = 0;
let totalGifs = 0;
let isLoading = false;
let hasMore = true;
let searchTimer;
let toastTimer;
let requestController;
function showToast(text) {
    toastText.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}
function showMessage(text) {
    message.textContent = text;
    message.classList.remove("hidden");
}
function hideMessage() {
    message.textContent = "";
    message.classList.add("hidden");
}
function setLoading(state) {
    isLoading = state;
    loading.classList.toggle("hidden", !state);
    if (loadMore) {
        loadMore.disabled = state;
        loadMore.style.display = state || hasMore ? "inline-flex" : "none";
    }
}
function updateHeading() {
    if (currentQuery) {
        title.textContent = `Results for "${currentQuery}"`;
        kicker.textContent = "SEARCH RESULTS";
    } else {
        title.textContent = "Trending GIFs";
        kicker.textContent = "FRESH REACTIONS";
    }
}
function updateCount() {
    count.textContent = `${totalGifs.toLocaleString()} GIFs`;
}
function updateLoadMore() {
    loadMore.style.display = hasMore ? "inline-flex" : "none";
}
function createGifCard(gif) {
    const card = document.createElement("article");
    card.className = "card";
    const image = document.createElement("img");
    image.src = gif.images.fixed_width.url;
    image.alt = gif.title || "GIF reaction";
    image.loading = "lazy";
    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const gifTitle = document.createElement("h3");
    gifTitle.className = "card-title";
    gifTitle.textContent = gif.title || "Untitled GIF";
    const copyButton = document.createElement("button");
    copyButton.className = "copy";
    copyButton.type = "button";
    copyButton.setAttribute("aria-label", "Copy GIF link");
    copyButton.textContent = "Copy Link";
    copyButton.addEventListener("click", () => {
        copyGifLink(gif.url);
    });
    bottom.appendChild(gifTitle);
    bottom.appendChild(copyButton);
    card.appendChild(image);
    card.appendChild(bottom);
    return card;
}
async function copyGifLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        showToast("GIF link copied successfully!");
    } catch (error) {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            const copied = document.execCommand("copy");

            if (copied) {
                showToast("GIF link copied successfully!");
            } else {
                showToast("Could not copy link. Please try again.");
            }
        } catch {
            showToast("Could not copy link. Please try again.");
        }
        textArea.remove();
    }
}
async function fetchGifs(reset = false) {
    if (isLoading) return;
    if (reset) {
        currentOffset = 0;
        hasMore = true;
        grid.innerHTML = "";
        hideMessage();
    }
    if (!hasMore) return;
    if (!API_KEY || API_KEY === "YDCfBo2LambljGLKhiG4hybf4GeeAHT3") {
        showMessage("Please add your GIPHY API key in script.js.");
        updateLoadMore();
        return;
    }
    setLoading(true);
    if (requestController) {
        requestController.abort();
    }
    requestController = new AbortController();
    const endpoint = currentQuery ? "search" : "trending";
    const params = new URLSearchParams({
        api_key: API_KEY,
        limit: LIMIT,
        offset: currentOffset,
        rating: "g",
        lang: "en"
    });
    if (currentQuery) {
        params.set("q", currentQuery);
    }
    try {
        const response = await fetch(
            `${API_URL}/${endpoint}?${params.toString()}`,
            {
                signal: requestController.signal
            }
        );
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        const result = await response.json();
        const gifs = result.data || [];
        if (reset) {
            grid.innerHTML = "";
        }
        if (gifs.length === 0 && currentOffset === 0) {
            showMessage("No GIFs found. Try another search.");
            totalGifs = 0;
            hasMore = false;
            updateCount();
            return;
        }
        gifs.forEach(gif => {
            grid.appendChild(createGifCard(gif));
        });
        currentOffset += gifs.length;
        totalGifs = result.pagination?.total_count || 0;
        hasMore = gifs.length === LIMIT && currentOffset < totalGifs;
        updateCount();
        hideMessage();
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }
        showMessage(
            "Unable to load GIFs. Check your internet connection and API key, then try again."
        );
    } finally {
        setLoading(false);
        updateLoadMore();
    }
}
function searchGifs(query) {
    currentQuery = query.trim();
    updateHeading();
    fetchGifs(true);
}
searchForm.addEventListener("submit", event => {
    event.preventDefault();
    clearTimeout(searchTimer);
    searchGifs(searchInput.value);
});
searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchGifs(searchInput.value);
    }, 450);
});
document.querySelectorAll("[data-query]").forEach(button => {
    button.addEventListener("click", () => {
        const query = button.dataset.query || "";
        searchInput.value = query;
        document.querySelectorAll("[data-query]").forEach(item => {
            item.classList.remove("active");
        });
        button.classList.add("active");
        searchGifs(query);
        document.getElementById("gallery").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});
loadMore.addEventListener("click", () => {
    fetchGifs(false);
});
if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMore) {
                fetchGifs(false);
            }
        });
    }, {
        rootMargin: "300px"
    });

    observer.observe(sentinel);
}
updateHeading();
fetchGifs(true);

