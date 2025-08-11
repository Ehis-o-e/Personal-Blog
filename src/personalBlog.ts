import express  from 'express';

const app = express();
app.set("view engine", "ejs")
const PORT = 3000;

app.get('/', (req,res) =>{
    res.render('index');
})

app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
})