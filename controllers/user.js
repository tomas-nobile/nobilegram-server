const User = require("../models/user");
const bcrypt= require('bcryptjs')
const jwt= require('jsonwebtoken')
const awsUploadImage = require('../utils/aws-upload-image')


function createToken(user, SECRET_KEY, expiresIn){
  const {id,name,email,username}= user;
  const payload= {
    id,
    name,
    email,
    username
  }
  return jwt.sign(payload, SECRET_KEY, {expiresIn})
}

async function register(input){
    const newUser = input;
newUser.email = newUser.email.toLowerCase();
newUser.username = newUser.username.toLowerCase();

const { email, username, password } = newUser;

const foundEmail = await User.findOne({ email });
if (foundEmail) throw new Error("El email ya esta en uso");

const foundUsername = await User.findOne({ username });
if (foundUsername) throw new Error("El usuario ya esta en uso");

//Encriptar
  const salt= await bcrypt.genSaltSync(10);
  newUser.password= await bcrypt.hash(password,salt)

try {
  const user = new User(newUser);
  user.save();
  return user;
} catch (error) {
  console.log(error);
}
}

async function login (input){
  const { email, password}= input;

  const userFound= await User.findOne({email: email.toLowerCase()})
  if(!userFound) throw new Error("Error en el email");

  const passwordSucess= await bcrypt.compare(password, userFound.password);
  if(!passwordSucess) throw new Error("Error en contraseña");

 

  return {
    token:createToken(userFound,process.env.SECRET_KEY,"365d")
    
  }
}

async function getUser (id,username){
  let user;
  if(id) user= await User.findById(id);
  if (username) user= await User.findOne({username});

  return user;
}

async function updateAvatar(file,ctx){
  const {id}= ctx.user
  const {createReadStream, mimetype}= await file;
  const extension = mimetype.split('/')[1];
  const imageName=`avatar/${id}.${extension}`;
  const fileData= createReadStream();

  try {
    const result = await awsUploadImage(fileData, imageName);
    await User.findByIdAndUpdate(id,{avatar:result})
    return{
      status:true,
      urlAvatar:result
    }
  } catch (error) {
    console.log(error);
    return{status:false,
    urlAvatar:null
    }
  }
  return null
}

async function deleteAvatar(ctx){
  const {id}=ctx.user;
  try {
    await User.findByIdAndUpdate(id,{avatar:''})
    return true
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function updateUser(input,ctx){
  const {id}=ctx.user;

  try {
    if(input.currentPassword && input.newPassword){
      const userFound= await User.findById(id);
      const passwordSucess= await bcrypt.compare(
        input.currentPassword,
        userFound.password
      );
      if(!passwordSucess) throw new Error('Contraseña incorrecta');

      const salt= await bcrypt.genSaltSync(10);
      const newPasswordCrypt= await bcrypt.hash(input.newPassword,salt);

      await User.findByIdAndUpdate(id, {password:newPasswordCrypt})

    }else{
      await User.findByIdAndUpdate(id,input);
    }
    return true
  } catch (error) {
    console.log(error);
    return false
  }
}

async function search(search){
  const users= await User.find({
    name:{$regex: search, $options:"i"}
  });
  return users
}

module.exports= {
register,
login,
getUser,
updateAvatar,
deleteAvatar,
updateUser,
search
}