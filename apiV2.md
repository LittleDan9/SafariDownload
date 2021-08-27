# API v2 Structure

## Getting Book Details

https://learning.oreilly.com/api/v2/epubs/urn:orm:book:9781617291654/


``` json
{
   "ourn":string,
   "identifier":string,
   "isbn":?,
   "url":string:URL,
   "content_format":string,
   "publication_date":string:YYYY-MM-DD,
   "created_time":datetime:YYYY-MM-DDTHH:MM:SS.tttZ,,
   "last_modified_time":datetime:YYYY-MM-DDTHH:MM:SS.tttZ,,
   "title":string,
   "is_hidden":boolean,
   "has_mathml":boolean,
   "virtual_pages":int,
   "opf_unique_identifier_type":string,
   "page_count":int,
   "total_running_time_secs":int,
   "total_size":int,
   "descriptions":{
      "text/html":string:HTML
   },
   "spine":string:URL,
   "files":string:URL,
   "table_of_contents":string:URL,
   "chapters":string:URL,
   "tags":[
      
   ],
   "language":string,
   "resources":[
      {
         "url":string:URL,
         "type":string,
         "description":string
      }
   ]
}
```

## Get the chapters

URL: <https://learning.oreilly.com/api/v2/epub-chapters/?epub_identifier=urn:orm:book:9781617291654>

This URL provides a JSON object that contains all of the chapter for this book in the following format

```json
{
    "count": int:ArraySize,
    "next": string:URL,
    "previous": ?,
    "results":[{ //Array Size of "count" contains the follow fields
        "ourn":string,
        "reference_id":string,
        "url": string:URL,
        "title": string:ChapterTitle,
        "total_size":int,
        "virtual_pages":int,
        "has_mathml":boolean,
        "created_time":datetime:YYYY-MM-DDTHH:MM:SS.tttZ,
        "last_modified_time":datetime:YYYY-MM-DDTHH:MM:SS.tttZ,
        "epub_archive":string:URL,
        "content_url":string:URL, //Chapter Content
        "related_assets":{
            "audio_files":[],
            "fonts":[],
            "html_files":[string:URL],
            "images":[string:URL],
            "next_chapter":{
                "url":string:URL,
                "title":string,
                "ourn":string,
            },
            "other_assets":[],
            "previous_chapter":{
                "url":string:URL,
                "title":string,
                "ourn":string,                
            },
            "scripts":[string:URL],
            "stylesheets":[string:URL],
            "svgs":[string:URL],
            "videos":[string:URL]
        },
        "indexed_position":int, //Where physically, by number, does this chapter fall.
        "minutes_required":int //How long does it take to read.
    }]
```
