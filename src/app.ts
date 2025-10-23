import express from 'express';
import session from 'express-session';
import fs from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { checkAuthentication, entries, renderPost, loadJSONFile,getContent } from './functions.js';
import 'dotenv/config';
import Groq from 'groq-sdk';

const credentials = {
    username: process.env.ADMIN_USERNAME,
    pwd: process.env.ADMIN_PASSWORD
}

if (!credentials.username || !credentials.pwd) {
    console.error('Missing environment variables! Please create a .env file with:');
    console.error('ADMIN_USERNAME=your_username');
    console.error('ADMIN_PASSWORD=your_password');
    process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Test Groq connection
groq.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello world' }],
    model: 'llama-3.3-70b-versatile',
    max_tokens: 10
}).then((result) => {
    console.log(' Groq connected successfully!');
}).catch((error) => {
    console.error(' Groq connection failed:', error.message);
});

function main() {
    // Create post directory if it doesn't exist
    if (!fs.existsSync('./post')) {
        fs.mkdirSync('./post', { recursive: true });
    }

    const app = express();
    app.set("view engine", "ejs")
    app.use(express.urlencoded({ extended: true }))
    app.use(express.static('public'));
    app.use(session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: false
    }))
    app.use('/admin', checkAuthentication);
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

app.get('/login', (req, res) => {
    res.render('login', {
       username:'',
       pwd:'',
       error:'' 
    })
})

app.get('/logout', (req, res)=>{
    (req.session as any).authenticated = false;
    res.redirect('/')
})

app.get('/reset-admin', (req, res) => {
    res.render('reset', {
        username:'',
        password:''
    });
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

app.post('/admin/generate-content', async(req, res) =>{
   try {
        const userPrompt = req.body.prompt;
        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: `Write a blog about: ${userPrompt}. Please write in plain text 
                without any markdown formatting, asterisks, or special characters. 
                Just write normal paragraphs and leave a space after each paragraph.` }],
            model: 'llama-3.3-70b-versatile',
            max_tokens: 500
        });
        const generatedContent = completion.choices[0]?.message?.content;
            if (generatedContent) {
                res.json({ content: generatedContent });
            } else {
                res.status(500).json({ error: 'No content generated' });
            }
   } catch (error) {
         console.error('AI generation error:', error);
        res.status(500).json({ error: 'Failed to generate content' });
   }
})

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.pwd;
    
    if(credentials.username === username && credentials.pwd === password){
        (req.session as any).authenticated = true
        res.redirect("/admin")
    }else{
        res.render('login', {
            username:'',
            pwd:'',
            error:'Wrong username or password'
        })
    }
})

app.post('/reset-admin', (req, res) => {
    const newUsername = req.body.username;
    const newPassword = req.body.password;
    
    const envContent = `ADMIN_USERNAME=${newUsername}\nADMIN_PASSWORD=${newPassword}`;
    fs.writeFileSync('.env', envContent);

    credentials.username = newUsername;
    credentials.pwd = newPassword;
    
    console.log('Environment file updated!');
    res.redirect('/login');
});

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

main();