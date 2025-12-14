import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        if(!user) {
            console.log("User not found while generating tokens");
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error while generating tokens", error);
        throw new ApiError(500, "Internal Server Error");
    }
}

const registerUser = asyncHandler( async (req, res) => {
    const { username, email, password, fullname } = req.body;

    if([username, fullname, email, password].some(field => typeof field !== 'string' || field.trim() === '')) {
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne( {
        $or: [ { username }, { email }]
    })

    if(existingUser) {
        throw new ApiError(409, "Username or Email already in use");
    }

    const profilePictureLocalPath = req.files?.profilePicture?.[0]?.path || null;
    let profilePictureUrl = null;
    if(profilePictureLocalPath) {
        const uploadResult = await uploadOnCloudinary(profilePictureLocalPath);
        profilePictureUrl = uploadResult?.secure_url || null;
    }
    
    const newUser = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullname,
        profilePicture: profilePictureUrl || ""
    })

    await newUser.save();

    const createdUser = await User.findById(newUser._id).select('-password -refreshToken')
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
})

const loginUser = asyncHandler( async (req, res) => {
    const { email, username, password } = req.body;

    if(!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
        $or: [
            {email},
            {username}
        ]
    });

    if(!user) {
        throw new ApiError(404, "Username or email is incorrect");
    }

    const isPasswordValid = await user.isPasswordValid(password);

    if(!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

    const options = {
        httpOnly: true
    }

    return res.status(200)
    .cookie('refreshToken', refreshToken, options)
    .cookie('accessToken', accessToken, options)
    .json(
        new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully")
    );
})

const logoutUser = asyncHandler(async (req, res) => {
    // console.log("req.user", req.user);
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

export { registerUser, loginUser, logoutUser };