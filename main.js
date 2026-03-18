(function() {
    let coverEnabled = false;
    let filterEnabled = false;
    const showMetaEl = document.querySelector('#meta-audio-area');
    const showEqEl = document.querySelector('#eq-audio-area');
    const showSetupEl = document.querySelector('#setup-audio-area');
    const viewPopupMenu = document.querySelector('#viewPopupMenu');
    const albumArtWrap = document.querySelector(".change-album-art");
    const changeCoverWrap = document.querySelector(".change-cover-header");
    const openFilterBtn = document.querySelector('#filterBtn');
    const showFilterEl = document.querySelector('#filter-mode');
    const dateSeved = document.querySelector('#date-seved');
    const sideMenu = document.querySelector('#sideMenu');
    const menuBtn = document.querySelector('#menuBtn');
    
    function hideAllPanels() {
        [showMetaEl, showEqEl,
            showSetupEl,
            showFilterEl,
            openFilterBtn].forEach(e => e.classList.remove('active'));
        document.body.style.overflow = '';
    }
    function fadeAllPanels(nav) {
        nav.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    document.querySelector('#openMetaBtn').addEventListener('click',
        () => {
            fadeAllPanels(showMetaEl);
        });
    document.querySelector('#closeMetaBtn').addEventListener('click',
        () => {
            showMetaEl.classList.remove('active'); document.body.style.overflow = '';
        });
    document.querySelector('#showCoverBtn').addEventListener('click',
        () => {
            albumArtWrap.classList.toggle('show'); changeCoverWrap.classList.toggle('show');
        });

    document.querySelector('#opqBtn').addEventListener('click',
        () => {
            hideAllPanels(); fadeAllPanels(showEqEl);
        });
    document.querySelector('#openEqBtn').addEventListener('click',
        () => fadeAllPanels(showEqEl));
    document.querySelector('#closeEqBtn').addEventListener('click',
        () => {
            showEqEl.classList.remove('active'); document.body.style.overflow = '';
        });

    document.querySelector('#openSetupBtn').addEventListener('click',
        () => {
            if (!areData) return showToast('no audio data'); hideAllPanels(); fadeAllPanels(showSetupEl);
        });
    document.querySelector('#closeSetupBtn').addEventListener('click',
        () => hideAllPanels());

    document.querySelector('#now-playing-preview').addEventListener('click',
        (e) => {
            e.stopPropagation(); viewPopupMenu.classList.add('active');
        });
    document.querySelector('#closePopupBtn').addEventListener('click',
        (e) => {
            e.stopPropagation(); viewPopupMenu.classList.remove('active');
        });

    function hideFilterPanels() {
        filterEnabled = !filterEnabled;
        if (filterEnabled) {
            showFilterEl.classList.add('active'); openFilterBtn.classList.add('active');
        } else {
            hideAllPanels();
        }}

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation(); hideAllPanels(); hideFilterPanels();
    });

    document.querySelector('#dateBtn').addEventListener('click', () => {
        dateSeved.classList.toggle('hidden');
    });

    document.querySelector('#menuBtn').addEventListener("click", () => fadeAllPanels(sideMenu));

    document.addEventListener("click", (e) => {
        if (e.target === sideMenu) {
            sideMenu.classList.remove('active');
            dateSeved.classList.add('hidden');
            document.body.style.overflow = '';
        }});

    /* get locale */
    function getUserLocale() {
        return navigator.languages?.[0] || navigator.language || "en-US";
    }

    /* parse locale */
    function parseLocale(locale) {
        const clean = locale.replace("_",
            "-");
        const parts = clean.split("-");
        return {
            language: parts[0]?.toLowerCase(),
            region: parts.find(p => p.length === 2)?.toUpperCase()
        };
    }

    /* get country */
    function getCountry() {
        const {
            region
        } = parseLocale(getUserLocale());
        return region || "US";
    }

    /* get country name */
    function getCountryName(code) {
        const regionNames = new Intl.DisplayNames(
            [navigator.language || "en"],
            {
                type: "region"
            }
        );
        return regionNames.of(code);
    }

    /* render */
    function renderLangWatermark() {
        const wrap = document.getElementById("langWatermark");
        if (!wrap) return;

        const country = getCountry();
        const countryName = getCountryName(country).toUpperCase();

        wrap.textContent =
        `${countryName} - ${country}`;
    }

    /* start */
    renderLangWatermark();
    setInterval(renderLangWatermark, 1000);

})();