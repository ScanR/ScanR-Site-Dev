const getSerieMeta = (jsonSerie) =>
    `<meta property="og:type" content="website">
    <meta property="og:title" content="ScanR - ${jsonSerie.title}">
    <meta property="og:image" content="${jsonSerie.cover}">
    <meta property="og:url" content="https://teamscanr.fr">
    <meta property="og:description" content="${jsonSerie.description.replaceAll('\"', '!&quot;')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />`

const fetchWithCache = async (url, cache = 0) => (await fetch(url, {
    cf: {
        cacheTtl: cache,
        cacheEverything: true,
    }
})).json();


export async function onRequest({request, env, next}) {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    if (path.length === 0) {
        const assetUrl = new URL("/index.html", url.origin);
        const html = await env.ASSETS.fetch(assetUrl);
        return new Response(html.body, html);
    }
    if (["static","api"].includes(path[0])) {
        return next();
    }

    const [slug, chapWithTiret, page] = path;
    const chap = chapWithTiret?.replaceAll("-", ".");

    const jsonFile = await fetchWithCache("https://cdn.hayasaku.fr/index.json", 60 * 60);

    if (!jsonFile[slug]) {
        return new Response("", {status: 404});
    }

    const fileName = jsonFile[slug];
    const jsonSerie = await fetchWithCache(`https://cdn.hayasaku.fr/${fileName}`, 60 * 5)

    if (!chap) {
        const rewriter = new HTMLRewriter().on("head", {
            element(el) {
                el.append(getSerieMeta(jsonSerie), {html: true})
            }
        })
        url.pathname = '/static/pages/serie/serie';    // Change only the pathname
        const newRequest = new Request(url.toString(), request);
        const response = await env.ASSETS.fetch(newRequest);
        return rewriter.transform(response);
    }

    const rewriter = new HTMLRewriter().on("head", {
        element(el) {
            el.append(getSerieMeta(jsonSerie), {html: true})
        }
    })

    url.pathname = '/static/pages/lecteur/lecteur';    // Change only the pathname
    const newRequest = new Request(url.toString(), request);
    const response = await env.ASSETS.fetch(newRequest);
    return rewriter.transform(response);


    // // Check if the pathname is /test
    // if ((path.length >= 2 && path[1])) {
    //     const actualPageUrl = new URL(request.url); // Create a new URL object based on the original request
    //     const jsonFile = await fetch("https://cdn.hayasaku.fr/index.json").then(res => res.json());
    //     if (jsonFile[path[1]]) {
    //         const slug = path[1];
    //         const fileName = jsonFile[slug];
    //         if (path.length >= 3 && path.length <= 5 && !path[4] && !Number.isNaN(path[2]) && (!path[3] || !Number.isNaN(path[3]))) {
    //             // POUR LES LECTEURS
    //             const base64File = btoa(`raw/ScanR/Cubari/refs/heads/main/${fileName}`);
    //             // const numChap = path[2];
    //             // const numPage = path[3] || "";
    //             const urlCubari = `https://teamscanr.fr/read/gist/${base64File}`
    //             const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
    //             const suffix = segments.slice(1).join('/');  // "1/1" ou "" si rien après
    //             let destination = urlCubari;
    //
    //             // Ajoute un slash terminal si besoin
    //             if (!destination.endsWith('/')) {
    //                 destination += '/';
    //             }
    //             // Si on a un suffix, on l’ajoute
    //             if (suffix) {
    //                 destination += suffix;
    //             }
    //             return Response.redirect(destination, 302);
    //             // return await fetch(`https://cubari.moe/read/gist/${base64File}/${numChap}/${numPage}`);
    //         }
    //     }
    // }
}