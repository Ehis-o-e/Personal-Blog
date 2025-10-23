import fs from 'fs';
import type{ Posts, TitleAndDate, ProcessedPost} from "./types.js";
import type { NextFunction, Request, Response } from 'express';



// Load a JSON file
export function loadJSONFile(filepath:string): Posts|null{
    if(!fs.existsSync(filepath)){
        console.log("There are no entries");
        return null;
    }

    try{
        const contents =fs.readFileSync(filepath, 'utf-8')
        return JSON.parse(contents) as Posts
    } catch(error){
        console.error(`Error loading file ${filepath}:`, error);
        return null;
    }
}

// Get titles and dates of all posts    
export function getTitleAndDate(filepath:string): TitleAndDate[]{
    const fileNames = fs.readdirSync(filepath)
    const td: TitleAndDate[] = []

    fileNames.forEach((fileName)=>{
        if (!fileName.endsWith('.json')) return;

        const content = loadJSONFile(`${filepath}/${fileName}`);
        if(content){
            td.push({
                filename:fileName, 
                title: content.title,
                date: content.date ? 
                    (typeof content.date === 'string' ? content.date : content.date.toISOString()) 
                    : 'No date'
            })
        }
    }
)
return td
}

 // Render a post
export function renderPost(res: Response, folder: string, filename: string, view: string) {
    const data = loadJSONFile(`${folder}/${filename}.json`);
    if (!data) {
        res.status(404).send("Post not found");
        return;
    }
    res.render(view, {
        title: data.title,
        date: data.date,
        content: data.content,
        filename: filename 
    });
}

//Get form content
export function getContent(req: Request ): Posts{
    const formTitle:string = req.body.title;
    const formDate:string|Date = req.body.date;
    const formContent:string = req.body.content;
    const formEntry = {
        title: formTitle,
        date:formDate,
        content: formContent,
    }

    return formEntry;
}

// Process entries for listing
export function entries(filepath:string, docName:string){
    const post = getTitleAndDate(`${filepath}`)
    const processedPosts: ProcessedPost[] = [];

    post.forEach((item)=>{
        const postName = item.filename;
        const postTitle:string = item.title;
        const postDate:string = item.date;

        const postHTML= `
        <div class= "post">
            <a href = "/${docName}/${postName.slice(0, -5)}"><h2>${postTitle}</h2></a>
            <p class="post-date">${postDate}</p>
        </div>`;

        processedPosts.push({
            html: postHTML,
            title: postTitle,
            date: postDate
        });
    })
return processedPosts;
}

// Authentication middleware
export function checkAuthentication(req:Request, res:Response, next: NextFunction){
    if ((req.session as any).authenticated) {
        next()
    } else {
        res.redirect('/login')
    }
}