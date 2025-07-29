export async function onRequest({request}) {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")
    if (!id) {
        return new Response("", {status: 404})
    }
    try {
        const html = await (await fetch(`https://imgchest.com/p/${id}`)).text();
        const regex = html.match(/<div id="app" data\-page="([^"]+)"><\/div>/);
        const json = JSON.parse(regex[1].replaceAll("&quot;", '"'));
        return Response.json(json.props.post.files);
    }catch (err) {
        console.error(err);
        return new Response(err, {status: 500});
    }
}