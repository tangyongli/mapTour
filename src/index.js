
import  shp from 'shpjs'; // 加载 shpjs 模块
import express from 'express';
import pg from 'pg';
import fs from 'fs';
import bodyParser from 'body-parser';
import multer from 'multer';


import cors from 'cors';
const app = express();
app.use(cors());

const port = 3000;



//const path = require('path');
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = path.join(__dirname, '..', 'public', 'web1.html');
const uploadPath=path.join(__dirname, '..', 'uploads');
app.get('/api/provinces', async (req, res) => {
    try {
        

        // 查询所有独特的省份名称
        const query = 'SELECT DISTINCT pr_name FROM country ORDER BY pr_name';
        const result = await client.query(query);

        // 仅提取省份名称
        const provinces = result.rows.map(row => row.pr_name);
        console.log('provinces', provinces);// return one list of provinces names

        res.json(provinces);
    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({ error: 'An error occurred while fetching provinces' });
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath) // 上传文件存放目录
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname) // 设置文件名称
    }
  })
  
const upload = multer({ storage: storage })

app.get("/tour", (req, res) => {
    // 读取文件并将其发送到客户端
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading file:", err);
            res.status(500).send('Error reading file');
            return;
        }
        res.send(data);
    });
});

//定义路由以保存用户的轨迹信息
// await client.connect()和awit client.query一起使用
// 如果前面已经连接了，使用client.query; await client.query一直没有结果

const client = new pg.Client({
    host: "localhost",
    port: 5432,
    database: 'geoweb',
    user: '',
    password: ''
});
client.connect();
// app.get('/images', (req, res) => {
//     const imagePath = req.query.path;
//     console.log('img',imagePath);
//     res.sendFile(imagePath, { root: '/var/www/mapgis/uploads' });
// });

app.post('/tour', upload.single('photo'), async (req, res) => {
    const lat = parseFloat(req.body.latitude);
    const lon = parseFloat(req.body.longitude);
    console.log('lat_lon', req.body.latitude, lon);
  
    const { startDate, endDate, weather } = req.body;
    console.log('req',req)
    console.log('file',req.file)
    const photoUrl = req.file ? path.join(uploadPath,req.file.filename) : null; // 获取图片 URL
    console.log('serverphotoUrl',photoUrl)
    try { // Wrap the query in a try...catch block
      
      console.log('database connect success!');
      const insertQuery = `
          INSERT INTO tour (startdate, enddate, weather, photo_url, lon, lat)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
      `;
  
      const result =await client.query(insertQuery, [startDate, endDate, weather, photoUrl, lon, lat]); 
      console.log('result',result)

      const data = {
        id: result.rows[0].id, // 假设 `id` 是数据库中插入数据的唯一标识符
        startDate: result.rows[0].startdate,
        endDate: result.rows[0].enddate,
        weather: result.rows[0].weather,
        photoUrl: result.rows[0].photo_url,
        lon: result.rows[0].lon,
        lat: result.rows[0].lat
      };
      console.log('Inserted Data:', data);
      res.status(201).json(data); 
    } catch (error) {
      console.error("Error:", error);
      console.log("Insert Query:", insertQuery); // 日志记录查询语句，以便检查
      console.log("Query Parameters:", [startDate, endDate, weather, photoUrl, lon, lat]); // 日志记录参数
      res.status(500).json({ error: 'An error occurred while saving the site info.' });
    } finally {
        // 关闭数据库连接
        if (client.connected) {
            await client.end();
        }}
  });
app.get('/api/cities', async (req, res) => {
    const provinceName = req.query.province; //provinceName ${provinceName}
    console.log('provinceName', provinceName);

    try {
       // await client.connect();
        const query = 'SELECT DISTINCT ct_name FROM country WHERE pr_name = $1 ORDER BY ct_name';
        const result = await client.query(query, [provinceName]);

        const cities = result.rows.map(row => row.ct_name);
        res.json(cities);
        console.log('cities', cities);
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'An error occurred while fetching cities' });
    } 
});
app.get('/api/country', async (req, res) => {
    const cityName = req.query.city; //provinceName ${provinceName}
    console.log('cityName', cityName);

    try {
       // await client.connect();
        const query = 'SELECT DISTINCT dt_name FROM country WHERE ct_name = $1 ORDER BY dt_name';
        const result = await client.query(query, [cityName]);

        const countries = result.rows.map(row => row.dt_name);
        res.json(countries);

    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'An error occurred while fetching coutries' });
    } finally { 
        await client.end();
    }
});
// app.use(uploadPath,express.static('uploads')); // Serve static files from the 'public' directory
//https://map.9990116.xyz/1720071348502-small.jpg
app.use('/uploads', express.static(path.join(__dirname,'..', 'uploads')));
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
})
