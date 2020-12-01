// ==UserScript==
// @name         Download Safari Books
// @namespace    http://littledan.com/
// @version      0.1
// @description  JavaScript Tool to Download a Safari Online Book to ePub format.
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
    }else{
        $("body").prepend('<svg style="position: absolute; width: 0; height: 0; overflow: hidden" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><symbol id="icon-download3" viewBox="0 0 16 16"><path d="M23 14l-8 8-8-8h5v-12h6v12zM15 22h-15v8h30v-8h-15zM28 26h-4v-2h4v2z"></path></symbol></defs></svg>');
        $("<style type='text/css'> .icon {display: inline-block;width: 1em;height: 1em;stroke-width: 0;stroke: currentColor;fill: currentColor;}</style>").appendTo("head");
        var button = $("<a/>")
            .addClass("l1")
            .addClass("nav-icn")
            .html('<svg class="icon icon-download3"><use xlink:href="#icon-download3"></use></svg><span>Download as eBook</span>')
            .click(function(){startDownload();});
        var li = $("<li/>");
        li.append(button);
        $("div.drop-content ul:first").append(li);
        console.log("Probably need to inject a download button here to request user input to download the book.");
    }

    function startDownload(){
        // Get the Book information
        $.get(baseURL + "/nest/epub/toc/?book_id=" + bookId, function(bookData){        
            //Get Book details
            $.get(baseURL + bookData.detail_url, function(detail){
                var html = $($.parseHTML(detail));
                var desc = html.find(".description").find("span")[0].outerHTML;
                jepub.init({
                    i18n: 'en', // Internationalization
                    title: bookData.title,
                    author: bookData.authors,
                    publisher: bookData.publisher.name,
                    description: desc,
                    //tags: [ 'epub', 'tag' ], // optional
                    date: Date.parse(bookData.pub_data)
                });
                jepub.uuid(bookId);

                // Download Chapter Content
                var chapterPromises = [];
                for(var i = 0; i < bookData.items.length; i++){
                    chapterPromises.push(getChapter(bookData.items[i]))              
                }
                //console.log("test");
                Promise.allSettled(chapterPromises).then(
                    function(results){
                        console.log(results);
                    }
                )
            })
        });
        //download("https://learning.oreilly.com/nest/epub/toc/?book_id=" + bookId, "/test/text.json");
    }

    function getChapter(chapter){
        return new Promise((resolve, reject) => {
            $.ajax({
                url: baseURL + chapter.url,
                success: function(chapterDetails){ 
                    $.get(chapterDetails.content, function(chapterHTML){
                        processChapter(
                            chapterDetails.title, 
                            chapter.order, 
                            chapterDetails.images, 
                            chapterDetails.asset_base_url, 
                            chapterHTML
                        ).then(function(){
                            resolve(chapterDetails);
                        });
                    });
                },
                error: function(error){reject(error)}
            })
        });
    }



    function processChapter(chapterName, chapterOrder, images, imgBaseURL, chapterHTML){
        return new Promise((resolve, reject) => {
            try{
                var chapterDOMTree = $('<div>' + chapterHTML + '</div>');
                // console.log(imgBaseURL);
                // console.log(images);
                if(images.length > 0){
                    // console.log("Image Count: " + images.length);
                    var imgPromises = [];
                    $.each(images, function(key, imgURL){
                        //Get the blob of the image and store it in the ebup
                        imgPromises.push(downloadImage(imgBaseURL, imgURL));
                    });
                    Promise.allSettled(imgPromises).then(
                        function(results) {
                            $.each(results, function(key, result){
                                if(result.status === "fulfilled"){
                                    // Add image to the ebub array image array.
                                    jepub.image(result.value.blob, result.value.id);
                                    // Add epub image replace code foreach img to DOM Tree
                                    chapterDOMTree.find("img[src='" + result.value.id + "']").replaceWith("<%= image[" + result.value.id + "] %>");             
                                }
                            });                       
                            resolve();
                        }
                    );
                }else{
                    // console.log("No Images");
                    jepub.add(chapterName, chapterDOMTree.html(), chapterOrder);
                    resolve();
                }
            }catch(ex){
                reject(ex);
            }
        });
    }

    let downloadImage = function(imgBaseURL, imgURL) {
        return new Promise(function(resolve, reject){
            jQuery.ajax({
                url: imgBaseURL + imgURL,
                cache:false,
                xhr: function(){
                    var xhr = new XMLHttpRequest();
                    xhr.responseType= 'blob'
                    return xhr;
                },
                success: function(imgBlob){
                    resolve({blob:imgBlob, id:imgURL})
                },
                error:function(ex){
                    reject(ex)
                }
            });
        });
    };

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