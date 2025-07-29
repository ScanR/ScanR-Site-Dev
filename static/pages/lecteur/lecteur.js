let CONFIG;

let direction = true; // true = droite defaut
let inversion = false;
let webtoon = false;
let double = false;
let offset = false;

let chapitres;
let chapitresDouble = [];
let chapitresOffset = [];
let indice = 0;


const init = async () => {
    const dev = await fetch("/static/config-dev.json");
    if (dev.status === 404) {
        CONFIG = await fetch("/static/config.json").then((res) => res.json());
    } else {
        CONFIG = await dev.json();
    }

    const path = document.location.pathname.split('/').filter(Boolean);
    const [slug, chapWithTiret, page] = path;
    const chap = chapWithTiret?.replaceAll("-", ".");

    let allSerie;
    const responseAllSerie = await fetch(`${CONFIG.URL_CDN}index.json`);
    if (!responseAllSerie.ok) throw new Error(`HTTP ${responseAllSerie.status}`);
    allSerie = await responseAllSerie.json();

    if(!allSerie[slug]) {
        return document.location("/404");
    }

    let serie;
    const urlJSON = `${CONFIG.URL_CDN}${allSerie[slug]}`;
    const responseSerie = await fetch(urlJSON);
    if (!responseSerie.ok) throw new Error(`HTTP ${responseSerie.status}`);
    serie = await responseSerie.json();

    const idChest = Object.values(serie.chapters[chap].groups)[0].split("/").pop();
    const urlChapter = `/api/imgChestApi?id=${idChest}`

    chapitres = await fetch(urlChapter)
        .then(res => res.json());

    let indexDouble = 0;
    let indexOffset = 0;

    chapitres = chapitres.map((page, index) => ({...page, idDiv: `page-${index + 1}`}));

    chapitres.forEach(page => {
        const imgElement = document.createElement("img");
        imgElement.classList.add("img", "img-none");
        imgElement.setAttribute("id", page.idDiv);
        imgElement.setAttribute("src", page.link);
        const lecteurDiv = document.querySelector("#lecteur");
        lecteurDiv.appendChild(imgElement);
        const getCurrent = (offset, index, chaps) => {
            let current = [];
            if (page.width > page.height) {
                index++;
            } else if (index % 2 !== offset) {
                const last = chaps.at(-1);
                if (last && last[0].width <= last[0].height) {
                    current = chaps.pop();
                }
            }
            index++;
            current.push(page);
            chaps.push(current);
            return index;
        }
        indexDouble = getCurrent(1, indexDouble, chapitresDouble);
        indexOffset = getCurrent(0, indexOffset, chapitresOffset);
    });

    console.log(chapitresDouble);
    console.log(chapitresOffset);
    showPage();

    document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        switch (key) {
            case "arrowleft" :
                turn(!direction);
                break;
            case "arrowright" :
                turn(direction);
                break;
            case "d" :
                toggleDouble();
                break;
            case "o" :
                toggleOffset();
                break;
            case "w" :
                toggleWebtoon();
                break;
            case "s" :
                toggleSens()
                break;
            case "i" :
                toggleInversion()
                break;
        }
    })
}

const toggleDouble = () => {
    const lecteurDiv = document.querySelector("#lecteur");
    if (double) {
        let current = (offset ? chapitresOffset : chapitresDouble)[indice][0];
        indice = chapitres.findIndex(p => p.idDiv === current.idDiv);
        lecteurDiv.classList.remove("lecteur-double");
    } else {
        let current = chapitres[indice];
        let chaps = offset ? chapitresOffset : chapitresDouble;
        indice = chaps.findIndex(dp => dp.find(p => p.idDiv === current.idDiv));
        lecteurDiv.classList.add("lecteur-double");
    }
    double = !double;
    console.log(double);
    showPage();
}

const toggleOffset = () => {
    offset = !offset;
    showPage();
}

const toggleWebtoon = () => {
    const lecteurDiv = document.querySelector("#lecteur");
    webtoon = !webtoon;
    if (webtoon) {
        lecteurDiv.classList.add("lecteur-webtoon");
        const allImg = document.querySelectorAll(".img.img-none")
        Array.from(allImg).forEach(img => img.classList.remove("img-none"));
    } else {
        lecteurDiv.classList.remove("lecteur-webtoon");
        showPage();
    }
}

const toggleSens = () => {
    direction = !direction;
    toggleInversion();
    toggleOffset();
}

const toggleInversion = () => {
    if (webtoon) return;
    const lecteurDiv = document.querySelector("#lecteur");
    inversion = !inversion;
    if (inversion) {
        lecteurDiv.classList.add("lecteur-inversion");
    } else {
        lecteurDiv.classList.remove("lecteur-inversion");
    }
}


const turn = (right) => {
    if (webtoon) return;
    if (right) {
        nextPage();
    } else {
        previousPage();
    }
}

const nextPage = () => {
    if (indice < chapitres.length) {
        indice++;
        if (double && chapitres[indice - 1].double) indice++;
        showPage();
    }
}

const previousPage = () => {
    if (indice > 0) {
        indice--;
        if (double && chapitres[indice + 1].double) indice--;
        showPage();
    }
}

const showPage = () => {
    const allImg = document.querySelectorAll(".img:not(.img-none)")
    Array.from(allImg).forEach(img => img.classList.add("img-none"));

    let current;
    let currentDouble;
    if (double) {
        if (offset) {
            currentDouble = chapitresOffset[indice];
        } else {
            currentDouble = chapitresDouble[indice];
        }
        current = currentDouble[0];
    } else {
        current = chapitres[indice];
    }

    const imgDiv = document.querySelector(`#${current.idDiv}`);
    imgDiv.classList.remove("img-none");

    if (double && currentDouble.length === 2) {
        const imgDiv2 = document.querySelector(`#${currentDouble[1].idDiv}`);
        imgDiv2.classList.remove("img-none");
    }
}

init();