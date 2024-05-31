import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';


import { AppModule } from './app.module';
import ConnectDB from './middleware/database/index';

import { PARAM_API_PORT, PP_PLATFORM_NICKNAME } from './parameters';

import * as fs from 'fs';


async function bootstart() {

    const httpsOptions = {
        key: fs.readFileSync('./secrets/https/srv/srv_priv.key'),
        cert: fs.readFileSync('./secrets/https/srv/srv_cert.cer'),
    };

    await ConnectDB();

    const app = await NestFactory.create(AppModule, { 
        cors: true, 
        httpsOptions: httpsOptions,  // Comment this line to change to http accordingly to your environment
    });
    
    app.use(bodyParser.json({limit: '100mb'}));
    app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
    app.enableCors();
    
    await app.listen(PARAM_API_PORT);
}

bootstart();

