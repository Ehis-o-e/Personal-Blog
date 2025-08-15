import express  from 'express';
import fs from 'fs';
import type { Request, Response } from 'express';

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
                date: content.date ? 
                    (typeof content.date === 'string' ? content.date : content.date.toISOString()) 
                    : 'No date'
            })
        }
    }
)
return td
}

function renderPost(res: Response, folder: string, filename: string, view: string) {
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

function getContent(req: Request ): Posts{
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

function entries(filepath:string, docName:string){
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

const app = express();
app.set("view engine", "ejs")
app.use(express.urlencoded({extended: true}))
const PORT = 3000;

app.get('/', (req,res) =>{
    const processedPosts = entries("./post", "post") ;
    res.render('index',  {posts: processedPosts,
        pageTitle: "My Blog Posts"});
})

app.get('/admin/edit/:filename', (req, res) => {
    const data = loadJSONFile(`./post/${req.params.filename}.json`);
    if (!data) {
        return res.status(404).send("Post not found");
    }
    res.render('adminEntry', {action: `/admin/edit/${req.params.filename}`, 
    title: data.title,
    date: data.date,
    content: data.content,
    filename: req.params.filename})
})

app.get('/admin/delete/:filename', (req,res) => {
    const data = loadJSONFile(`./post/${req.params.filename}.json`)
    res.render('delete',
        {action:`/admin/delete/${req.params.filename}`,
        title: data!.title
    })
})

app.get('/post/:filename', (req: Request, res: Response) => {
    renderPost(res, './post', req.params.filename!, 'post');
});

app.get('/admin/new', (req, res) => {
    res.render('adminEntry', {action: '/admin/create', 
        title: '',
        date: '',
        content: '',
        filename: ''
    });
})

app.get('/admin', (req, res) => {
    const adminPosts = entries("./post", "admin") ;
    res.render('admin',  {posts: adminPosts,
        pageTitle: "Admin Panel"});
})

app.get('/admin/:filename', (req: Request, res: Response) => {
    renderPost(res, './post', req.params.filename!, 'adminPost');
});

app.post('/admin/edit/:filename', (req, res) => {
    const formEntry = getContent(req);
    const formname = `${req.body.filename}.json`;
    const complete = JSON.stringify(formEntry); 
    fs.writeFileSync(`./post/${formname}`, complete, 'utf-8')
    res.redirect(`/admin/${formname.slice(0, -5)}`)
})

app.post('/admin/delete/:filename', (req, res) => {
    if(req.body.delete === "yes"){
        try {
            fs.unlinkSync(`./post/${req.params.filename}.json`)
            res.redirect('/admin')
        } catch (error) {
           return res.status(404).send("File not found");
        }
        
    }else{
        res.redirect(`/admin/${req.params.filename}`)
    }
})

app.post('/admin/create', (req, res)=> {
    const formEntry = getContent(req);
    const formname = `${req.body.title}-${Date.now()}.json`;
    const complete = JSON.stringify(formEntry); 
    fs.writeFileSync(`./post/${formname}`, complete, 'utf-8')
    res.redirect(`/admin/${formname.slice(0, -5)}`)
})


app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
})