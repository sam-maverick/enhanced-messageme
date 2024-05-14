import {  } from '../parameters.js';

import * as FileSystem from 'expo-file-system';

var png = require('png-metadata');


import { 
    EncodeFromB64ToBinary, 
    EncodeFromBinaryToB64, 
    EncodeFromB64ToUTF8,
    EncodeFromUTF8ToB64,
    EraseLocalData, 
    ErrorAlert, 
    ErrorAlertAsync, 
    AsyncAlert, 
    LogMe, 
    UpdateLogMeUsername, 
    InitialisationActions,
    ReadMyFileStream,
    WriteMyFileStream,
    IsValidImageExtensionAndContentType,
    LoadBaseImageAssetFileB64,
 } from '../myGeneralLibrary.jsx';



// wrappedPicture is an enveloppe containing a private picture, in base64 formatted String
// It returns an object
export async function UnwrapPicture (wrappedPictureObject) {
  LogMe(1, 'UnwrapPicture() called');
  let s = EncodeFromB64ToBinary(wrappedPictureObject);

  LogMe(1, 'Parsing PNG metadata');
  let list = png.splitChunk(s);
  LogMe(2, 'Metadata contents:'+JSON.stringify(list))

  let ppPpChunkFound = false;
  let ppPpChunkContents = '';

  await list.forEach(function (arrayItem) {
      if (arrayItem?.type === 'ppPp' && arrayItem?.data) {
          LogMe(1, 'Found ppPp chunk with data');
          ppPpChunkFound = true;
          ppPpChunkContents = JSON.parse(arrayItem.data);
      }
  });

  if (!ppPpChunkFound) {
    throw new Error('ppPp chunk was not found or it did not contain data');
  } else {
    return ppPpChunkContents;
  }
}



// plainPicture is a picture content in base64 formatted String
// It returns a base64 formatted String
export async function WrapPicture (plainPicture, fileExt) {
    LogMe(1, 'wrapPicture() called');

    // TBC: Wrap cryptographically

    let ppPlainPictureObjectStr = JSON.stringify({'data': plainPicture, 'contentType': [fileExt]});

    //LogMe(1,';;;;;'+require('../../assets/custom/base_image_for_wrapping.png'));
    
    // load from file
    //var sb64 = await FileSystem.readAsStringAsync(require('../../assets/custom/base_image_for_wrapping.png'), {encoding: 'base64'});
    //var sb64 = await FileSystem.readAsStringAsync('asset:/assets/custom/base_image_for_wrapping.png', {encoding: 'base64'});
    var s = EncodeFromB64ToBinary(require('../../bundled_files/json/base_image_for_wrapping.png.json').data);

    // WARNING .-
    // Referencinf Assets in Image components works fine in all cases.
    // Reading Asset files works just fine with the bare workflow on metro, but it doesn't work with the production build of APK/AAB.
    // Therefore, EncodeFromB64ToBinary() does not work
    //var s = EncodeFromB64ToBinary(await LoadBaseImageAssetFileB64());

    // split
    var list = png.splitChunk(s);
    // append
    var iend = list.pop(); // remove IEND

    var newchunk1 = png.createChunk("ppPp", ppPlainPictureObjectStr);
    //https://en.wikipedia.org/wiki/PNG
    list.push(newchunk1);

    // Not necessary:
    //var newchunk2 = png.createChunk("ppPt", "Wrapped private picture");
    //https://en.wikipedia.org/wiki/PNG
    //list.push(newchunk2);

    list.push(iend);
    // join
    var newpng = png.joinChunk(list);
    // save to file
    //fs.writeFileSync(outfile, newpng, 'binary');
    return EncodeFromBinaryToB64(newpng);

}
