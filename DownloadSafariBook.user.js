// ==UserScript==
// @name         Download Safari Books
// @namespace    http://littledan.com/
// @version      0.1
// @description  JavaScript Tool to Download a Safari Online Book to ePub format.
// @author       Daniel R. Little
// @match        https://learning.oreilly.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// @require      http://littledan.com/jepub.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.5.0/jszip.min.js
// @require      https://npmcdn.com/ejs/ejs.min.js
// ==/UserScript==

(function() {
    'use strict';
    const jepub = new jEpub();
    var chapters = Array()
    const regEx = /\/[0-9]{10,13}\//g
    const baseURL = "https://learning.oreilly.com";
    var bookId = window.location.href.match(regEx)[0].replace(/\//g,'')
    if(bookId === undefined){
        console.error("Unable to extract book Id.");
        return;
    }else{

        $("<style type='text/css'>.svg-icon {width: 1em;height: 1em;} .svg-icon path, .svg-icon polygon, .svg-icon rect {fill: #4691f6;} .svg-icon circle {stroke: #4691f6; stroke-width: 1;}</style>").appendTo("head");
        var button = $("<a/>")
            .addClass("orm-Link-root orm-Link-hasIcon")
            .attr("href", "#")
            .attr("id", "eBookDownload")
            .html('<span class="orm-Icon-root orm-Link-icon orm-ff-NavigationView-linkIcon" aria-hidden="true" data-testid="icon" style="height: 1rem;"><span class="orm-Icon-icon" aria-hidden="true" style="font-size: 1rem; width: 1rem; height: 1rem;"><svg class="svg-icon" viewBox="0 0 20 20"><path fill="none" d="M9.896,3.838L0.792,1.562v14.794l9.104,2.276L19,16.356V1.562L9.896,3.838z M9.327,17.332L1.93,15.219V3.27l7.397,1.585V17.332z M17.862,15.219l-7.397,2.113V4.855l7.397-1.585V15.219z"></path></svg></span><span class="orm-Icon-title">Download eBook</span></span>')
            .click(function(e){console.log("Starting Download");startDownload(e);});
        var li = $("<li/>")
            .append(button)
            .addClass("orm-ff-NavigationView-headerListItem")
        $("div.orm-ff-NavigationView-headerControls ul:first").children("li:nth-last-child(2)").after(li);
    }

    function startDownload(e){
        e.preventDefault();
        // Get the Book information
        $.get(baseURL + "/nest/epub/toc/?book_id=" + bookId, function(bookData){
            //Get Book details
            $.get(baseURL + bookData.detail_url, function(detail){
                console.log(bookData);
                var html = $($.parseHTML(detail));
                var desc = html.find("[class^=description]").find("span")[0].outerHTML;
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
                // console.log(bookData)
                // return;

                downloadImage(baseURL, "/covers/" + bookId + "/600w/").then(
                    function(dlResult){
                        var reader = new FileReader();
                        reader.readAsArrayBuffer(dlResult.blob);
                        reader.onloadend = function() {
                            var buffer = reader.result;
                            jepub.cover(buffer);
                        }
                    }
                )

                // Download Chapter Content
                chapters = Array(bookData.items.length);
                var chapterPromises = [];
                for(var i = 0; i < bookData.items.length; i++){
                    chapterPromises.push(getChapter(bookData.items[i]))
                }
                //console.log("test");
                Promise.allSettled(chapterPromises).then(
                    function(results){
                        // console.log(results);
                        chapters = chapters.filter(function(e){return e != null;})
                        console.log(chapters);
                        for(var i = 0; i < chapters.length; i++){
                            //console.log(i + ". Add Content")
                            if(chapters[i].name.length == 0 && chapters[i].html.length > 0){
                                chapters[i].name = "Undefined"
                            }
                            jepub.add(chapters[i].name, chapters[i].html, i+1);
                        }
                        //console.log(jepub);
                        jepub.generate('blob', function updateCallback(metadata){
                            // TODO: Something better with ths progression data
                            // console.log("progression: " + metadata.percent.toFixed(2) + " %");
                        }).then(function(content){downloadBlob(content, bookData.title + ".epub");})
                    }
                )
            })
        });
    }

    function getChapter(chapter){
        return;
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
                                    let imgId = result.value.id;
                                    imgId = imgId.substring(imgId.indexOf('/')+1);
                                    imgId = imgId.substring(0, imgId.indexOf('.'))
                                    //console.log(imgId)
                                    // Add image to the ebub image array.
                                    //console.log(chapterOrder + ". Add Image");
                                    jepub.image(result.value.blob, imgId);
                                    // Add epub image replace code foreach img to DOM Tree
                                    //console.log(chapterDOMTree.find("img[src*='" +  imgId + "']"));
                                    chapterDOMTree.find("img[src*='" +  imgId + "']").replaceWith("<%= image['" + imgId + "'] %>");
                                }
                            });
                            var html = chapterDOMTree.html().toString();
                            html = html.replace(/&lt;/g, "<");
                            html = html.replace(/&gt;/g, ">");
                            addChapter(chapterName, html, chapterOrder);
                            resolve();
                        }
                    );
                }else{
                    addChapter(chapterName, chapterDOMTree.html(), chapterOrder);
                    resolve();
                }

            }catch(ex){
                reject(ex);
            }
        });
    }

    function addChapter(name, html, index){
        // The order in the jepub.add doe not change the order of insertion into the epub
        // Therefore, manually added them to an array based on the index of the chapter.
        console.log("Add " + name);
        //html = html.replace("<h2>" + name + "</h2>", "");
        //html = html.replace("<div class=\"chapter-title-wrap\">", "");)
        //html = html.replace("<h2 class=\"chapter-title\">" + name + "</h2>", "");
        chapters[index-1] = {name: name, html: html};
    }

    let downloadImage = function(imgBaseURL, imgURL) {
        return new Promise(function(resolve, reject){
            jQuery.ajax({
                url: imgBaseURL + imgURL,
                cache:false,
                xhr: function(){
                    var xhr = new XMLHttpRequest();
                    xhr.responseType = 'blob'
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

    function downloadBlob(blob, name = 'book.epub'){
        const blobURL = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobURL;
        link.download = name;
        document.body.appendChild(link);

        link.dispatchEvent(
            new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            })
        );
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