export const getCurrentUser = () => {

    const user = localStorage.getItem("user");

    if (!user) return null;


    console.log(JSON.parse(user));
    

    return JSON.parse(user);

};