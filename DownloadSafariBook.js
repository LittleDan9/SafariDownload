// ==UserScript==
// @name         Download Safari Books
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  JavaScript Tool to Download a Safairi Online Book to ePub format.
// @author       Daniel R. Little
// @match        https://learning.oreilly.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @require      https://unpkg.com/jepub/dist/jepub.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.5.0/jszip.min.js
// @require      https://npmcdn.com/ejs/ejs.min.js
// ==/UserScript==

(function() {
    'use strict';
    const regEx = /\/[0-9]{13}\//g
    const baseURL = "https://learning.oreilly.com";
    var bookId = window.location.href.match(regEx)[0].replaceAll('/','')//.replace('/','');
    var bookInfo = $.get(baseURL + "/nest/epub/toc/?book_id=" + bookId, function(data){
        console.log(data);
        $.get(baseURL + data.detail_url, function(detail){
            var html = $($.parseHTML(detail));
            var desc = html.find(".description").find("span")[0].outerHTML
            const jepub = new jEpub();
            jepub.init({
                i18n: 'en', // Internationalization
                title: data.title,
                author: data.authors,
                publisher: data.publisher.name,
                description: desc,
                tags: [ 'epub', 'tag' ], // optional
                date: Date.parse(data.pub_data)
            });
            console.log(data.items)
            for(var i = 0; i < data.items.length; i++){
                $.get(baseURL + data.items[i].url, function(result){
                    console.log(result);
                    //Download Chapter Content
                    //Change Image Tags
                    //Inject Image into epub
                    //jepub.add(data.items.label, result.data, i+1);
                });
            }
        });

    });
    //download("https://learning.oreilly.com/nest/epub/toc/?book_id=" + bookId, "/test/text.json");
})();

function download(url, filename) {
    fetch(url).then(function(t) {
        return t.blob().then((b)=>{
            var a = document.createElement("a");
            a.href = URL.createObjectURL(b);
            a.setAttribute("download", filename);
            a.click();
        }
      );
    });
}
