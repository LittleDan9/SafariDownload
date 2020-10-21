// ==UserScript==
// @name         Download Safari Books
// @namespace    littledan.com
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
    const jepub = new jEpub();
    var bookInfo;
    var bookDetails;
    const regEx = /\/[0-9]{13}\//g
    const baseURL = "https://learning.oreilly.com";
    var bookId = window.location.href.match(regEx)[0].replace(/\//g,'')
    if(bookId === undefined){
        console.error("Unable to extract book Id.");
        return;
    }
    $.get(baseURL + "/nest/epub/toc/?book_id=" + bookId, function(data){        
        $.get(baseURL + data.detail_url, function(detail){
            var html = $($.parseHTML(detail));
            var desc = html.find(".description").find("span")[0].outerHTML
            jepub.init({
                i18n: 'en', // Internationalization
                title: data.title,
                author: data.authors,
                publisher: data.publisher.name,
                description: desc,
                //tags: [ 'epub', 'tag' ], // optional
                date: Date.parse(data.pub_data)
            });
            jepub.uuid(bookId);

            // Download Chapter Content
            var chapterPromise = [];
            for(var i = 0; i < data.items.length; i++){
                chapterPromise.push(getChapter(data.items[i]));
            }

            $.when(chapterPromise).then(function(){console.log("Chapter Compelte");});
        });
    });
    //download("https://learning.oreilly.com/nest/epub/toc/?book_id=" + bookId, "/test/text.json");

    function getChapter(chapter){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: baseURL + chapter.url,
                success: function(chapterDetails){ 
                    $.get(chapterDetails.content, function(chapterHTML){
                        processChapter(chapterDetails.title, chapter.order, chapterDetails.images, chapterDetails.asset_base_url, chapterHTML);
                    })
                    resolve(chapterDetails);
                },
                error: function(error){reject(error)}
            })
        });
    }
    function processChapter(chapterName, chapterOrder, images, imgBaseURL, chapterHTML){
        var chapterDOMTree = $('<div>' + chapterHTML + '</div>');
        console.log(chapterOrder + ": " + chapterName)
        if(images.length > 0){
            console.log("Image Count: " + images.length);
            var imgPromises = [];
            $.each(images, function(key, value){
                // Add epub image replace code foreach img to DOM Tree
                chapterDOMTree.find("img[src='" + value + "']").replaceWith("<%= image[" + value + "] %>");             
            });

            // When all the images have downloaded and have been stored to the epub object
            // update the chapter HTML with the replace format for ebup.
            // Add the chapter to the epub.
            $.when(imgPromises).then(function(){
                console.log("Images Processed");
                jepub.add(chapterName, chapterDOMTree.html(), chapterOrder);  
            })            
        }else{
            console.log("No Images");
            jepub.add(chapterName, chapterDOMTree.html(), chapterOrder);
        }
    }

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
})();