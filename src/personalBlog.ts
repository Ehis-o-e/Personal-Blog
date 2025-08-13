import express  from 'express';
import fs from 'fs';

type Posts = {
    title: string;
    date:Date|string;
    content:string;
}

type TitleAndDate = {
    filename:string;
    title: string;
    date: string;
}

type ProcessedPost = {
    html: string;
    title: string;
    date: string;
};

function loadJSONFile(filepath:string): Posts|undefined{

    if(!fs.existsSync(filepath)){
        console.log("There are no entries");
        return undefined;
    }

    try{
             const contents =fs.readFileSync(filepath, 'utf-8')
            return JSON.parse(contents) as Posts
    } catch{
        return undefined;   
    }
}

function getTitleAndDate(filepath:string): TitleAndDate[]{
    const fileNames = fs.readdirSync(filepath)
    const td: TitleAndDate[] = []
    fileNames.forEach((fileName)=>{
        const content = loadJSONFile(`${filepath}/${fileName}`);
        if(content){
            td.push({
                filename:fileName, 
                title: content.title,
                date: typeof content.date === 'string' ? content.date : content.date.toISOString(),
            })
        }
    }
)
return td
}

console.log ()

const app = express();
app.set("view engine", "ejs")
const PORT = 3000;

app.get('/', (req,res) =>{
    const post = getTitleAndDate("./post")
     const processedPosts: ProcessedPost[] = [];

    post.forEach((item)=>{
        const postName = item.filename;
        const postTitle:string = item.title;
        const postDate:string = item.date;

        const postHTML= `
        <div class= "post">
            <a href = "/post/${postName.slice(0, -5)}"><h2>${postTitle}</h2></a>
            <p class="post-date">${postDate}</p>
        </div>`;

        processedPosts.push({
            html: postHTML,
            title: postTitle,
            date: postDate
        });
    })
    res.render('index',  {posts: processedPosts,
        pageTitle: "My Blog Posts"});
})

app.get('/post/:filename', (req,res)=>{
    const document = req.params.filename;
    const data = loadJSONFile(`./post/${document}.json`);
    if(!data){
        return res.status(404).send("Post not found")
    }
    res.render('post', data )
}
)

app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
})