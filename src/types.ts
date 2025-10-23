export type Posts = {
    title: string;
    date:Date|string;
    content:string;
}

export type TitleAndDate = {
    filename:string;
    title: string;
    date: string;
}

export type ProcessedPost = {
    html: string;
    title: string;
    date: string;
};
