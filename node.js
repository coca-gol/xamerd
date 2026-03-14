(function() {
    const inputIpv = document.querySelector("#pasteConvertUrl");
    const clearIpv = document.querySelector("#clearInputConvertBtn");
    const converter = document.querySelector("#converter-btn");
    const loading = document.querySelector("#loading-converter");
    const iframe = document.querySelector("#video-preview-iframe");
    const results = document.querySelector("#converter-results");
    const linksVideo = document.querySelector("#download-links-video");
    const linksAudio = document.querySelector("#download-links-audio");
    const spinVideo = document.querySelector("#spinner-load-videos");
    const spinAudio = document.querySelector("#spinner-load-audios");
    const convertFm = document.querySelector("#converter-button-format");
   // const API = `${location.protocol}//${location.hostname}:3000`;
    const API = "https://parties-investments-colleges-balanced.trycloudflare.com";
    let converting = false;
    let current_Title = "media";
    function resetConvertUI() {
        iframe.src = "";
        results.classList.remove("active");
        loading.classList.remove("active");
        convertFm.classList.add("hidden");
    }
    function sanitizeFilename(name) {
        return name.replace(/[\\/:*?"<>|]/g, "").trim();
    }
    function getYouTubeId(url) {
        try {
            const u = new URL(url);
            if (u.hostname.includes("youtu.be"))
                return u.pathname.slice(1);
            if (u.searchParams.get("v"))
                return u.searchParams.get("v");
            if (u.pathname.includes("/embed/"))
                return u.pathname.split("/embed/")[1];
            if (u.pathname.includes("/shorts/"))
                return u.pathname.split("/shorts/")[1];

            return null;
        } catch {
            return null;
        }
    }
    async function fetchInfo(url) {
        const res = await fetch(`${API}/info`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url
            })
        });
        if (!res.ok) throw new Error("Server error");
        return res.json();
    }
    function handleDownload(btn, spin, url, type) {
        btn.onclick = async () => {
            if (converting) {
                showToast("loading previous data", "", 1800);
                return;
            }
            try {
                converting = true;
                spin.classList.add("active");
                const res = await fetch(
                    `${API}/fetch?url=${encodeURIComponent(url)}&type=${type}`
                );
                if (!res.ok) throw new Error();
                const blob = await res.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `${current_Title}.${type === "video" ? "mp4": "mp3"}`;
                a.click();
                URL.revokeObjectURL(downloadUrl);
            } catch(e) {
                alert("conversion failed");
                convertFm.classList.add("hidden");
            } finally {
                converting = false;
                spin.classList.remove("active");
            } 
        };
    }

    /* ================= SETUP DOWNLOAD ================= */
    function setupDownloadButtons(url) {
        handleDownload(linksVideo, spinVideo, url, "video");
        handleDownload(linksAudio, spinAudio, url, "audio");
        convertFm.classList.remove("hidden");
    }
    converter.addEventListener("click", async () => {
        const url = inputIpv.value.trim();
        if (!url || !url.startsWith("https://")) {
            showToast("invalid links", "", 3600);
            return;
        }
        resetConvertUI();
        results.classList.add("active");
        loading.classList.add("active");

        try {
            /* preview iframe */
            const id = await getYouTubeId(url);

            if (id) iframe.src = `https://www.youtube.com/embed/${id}`;
            const info = await fetchInfo(url);
            current_Title = sanitizeFilename(info.title || "media");
            loading.classList.remove("active");
            setupDownloadButtons(url);
        } catch () {
            loading.classList.remove("active");

            if (getYouTubeId(url)) {
                setupDownloadButtons(url);
            } else {
                alert("failed to retrieve info");
            }
        }
    });
    clearIpv.addEventListener("click",
        () => {
            if (!inputIpv.value.trim()) return;
            inputIpv.value = "";
            resetConvertUI();

        });
}());