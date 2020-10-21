import {Buffer} from "https://deno.land/std@0.74.0/node/buffer.ts";
import {DOMParser, HTMLDocument} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import {readdirSync} from "https://deno.land/std@0.74.0/node/fs.ts";
import {Marked} from "https://deno.land/x/markdown@v2.0.0/mod.ts";

const addNotes = async (unit8arr: Buffer, path: string) => {
    let domParser = new DOMParser();
    let doc = domParser.parseFromString(unit8arr.toString(), "text/html");
    const decoder = new TextDecoder("utf-8");
    if (doc !== null) {
        for (const md of readdirSync("./notes")) {
            if (!md.endsWith(".md")) continue;
            const markdown = decoder.decode(await Deno.readFile("./notes/" + md));
            const markup = Marked.parse(markdown);
            if (markup.meta.path === path) {
                if (markup.meta["after-component"] != null) {
                    afterComponentName(doc, markup.meta["after-component"], markup.content);
                }
                else if (markup.meta["molang-query"] != null) {
                    forMolangQuery(doc, markup.meta["molang-query"], markup.content);
                }
            }
        }
        return Buffer.from(doc.children[0].outerHTML);
    }
    return unit8arr;
};

const afterComponentName = (doc: HTMLDocument, titleId: string, html: string) => {
    let querySelector = doc.querySelector("#" + titleId.replaceAll(':', '\\:'));
    if (
        querySelector != null && querySelector.parentElement != null &&
        querySelector.parentElement.nextElementSibling != null
    ) {
        let note = doc.createElement("p");
        note.innerHTML = html;
        querySelector.parentElement.nextElementSibling.after(note);
    }
};

const forMolangQuery = (doc: HTMLDocument, query: string, html: string) => {
    let elements = doc.getElementsByTagName("td")
    for (const element of elements) {
        if (element.textContent === query && element.nextElementSibling != null) {
            let note = doc.createElement("p");
            note.innerHTML = html;
            element.nextElementSibling.appendChild(note);
        }
    }
};

export {addNotes};
