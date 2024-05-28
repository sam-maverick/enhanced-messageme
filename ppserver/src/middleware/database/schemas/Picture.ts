import { Schema, model } from 'mongoose';

const PictureSchema = new Schema({
    pictureId: {type: String},
});


const PicturesModel = model('Pictures', PictureSchema);
export default PicturesModel;
