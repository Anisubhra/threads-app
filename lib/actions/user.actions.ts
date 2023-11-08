"use server"

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose"
import Thread from "../models/thread.model";
import { FilterQuery, SortOrder } from "mongoose";


interface Params {
    username: string,
    name: string,
    bio: string,
    image: string,
    userId: string,
    path: string,
}

export async function updateUser(
    {
        username,
        name,
        bio,
        image,
        userId,
        path,
    }: Params
): Promise<void> {

    try {
        connectToDB();

        await User.findOneAndUpdate(
            { id: userId },
            {
                username: username.toLowerCase(),
                name,
                bio,
                image,
                onboarded: true,
            },
            { upsert: true }
        );

        if (path === '/profile/edit') {
            revalidatePath(path);
        }
    }
    catch (err: any) {
        throw new Error(`Failed to create/update user: ${err.message}`);
    }
}

export async function fetchUser(userId: string) {
    try {
        connectToDB();

        return await User.findOne({ id: userId })
        // .populate({
        //     path: 'communities',
        //     model: 'Community'
        // })
    }
    catch (e: any) {
        throw new Error(`Failed to fetch user: ${e.message}`);
    }
}

export async function fetchUserPosts(userId: string) {
    try {
        connectToDB();

        // find all threads authored by the user with the given userId
        const threads = await User.findOne({ id: userId }).populate({
            path: 'threads',
            model: Thread,
            populate: {
                path: 'children',
                model: Thread,
                populate: {
                    path: 'author',
                    model: User,
                    select: 'name image id'
                }
            }
        })

        return threads;
    }
    catch (e: any) {
        throw new Error(`Failed to fetch user threads: ${e.message}`);
    }
}

export async function fetchUsers({
    userId,
    searchString = "",
    pageNumber = 1,
    pageSize = 20,
    sortBy = 'desc'
}: {
    userId: string,
    searchString?: string,
    pageNumber?: number,
    pageSize?: number,
    sortBy?: SortOrder
}) {
    try {
        connectToDB();

        const skipAmount = (pageNumber - 1) * pageSize;

        // Create a case-insensitive regular expression for the provided search string.
        const regex = new RegExp(searchString, 'i');

        // create an initial query object to filter users
        const query: FilterQuery<typeof User> = {
            id: { $ne: userId }
        }

        // if the search string is not empty, add the $or operator to match either username or name fields
        if (searchString.trim() !== '') {
            query.$or = [
                { username: { $regex: regex } },
                { name: { $regex: regex } },
            ]
        }

        const sortOptions = { createdAt: sortBy };

        const usersQuery = User.find(query)
            .sort(sortOptions)
            .skip(skipAmount)
            .limit(pageSize);

        const totalDocuments = await User.countDocuments(query);

        const users = await usersQuery.exec();

        const isNext = totalDocuments > skipAmount + users.length;

        return {
            users,
            isNext
        }
    }
    catch (e: any) {
        throw new Error(`Failed to fetch users: ${e.message}`);
    }
}

export async function getActivity(userId: string) {
    try {
        connectToDB();

        // find all the threads created by user
        const userThreads = await Thread.find({ author: userId });

        // collect all the child thread ids (replies) from the 'children' field
        const childThreadIds = userThreads.reduce((acc, userThread) => {
            return acc.concat(userThread.children)
        },[])

        // Find and return the child threads (replies) excluding the ones created by the same user
        const replies = await Thread.find({
            _id: { $in: childThreadIds },
            author: { $ne: userId }
        }).populate({
            path: 'author',
            model: User,
            select: 'name image _id'
        });

        return replies;
    }
    catch (e: any) {
        throw new Error(`Failed to fetch user activity: ${e.message}`);
    }
}