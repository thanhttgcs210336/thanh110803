const bcrypt=require('bcrypt');
const Admin = require('../models/admin');
const {User, roles} = require('../models/user');
const Faculty = require('../models/faculty');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Cookie } = require('express-session');
const multer = require('multer');
const Terms = require('../models/terms');
const Academy = require('../models/academy');
const Blog = require('../models/blog');


// upload image
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./uploads");
    },
    filename: function(req, file, cb) {
        // Generate a unique filename using the fieldname, current timestamp, and original filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '_' + uniqueSuffix + '_' + file.originalname);
    }
});

const upload = multer({
    storage: storage
}).single("image");



let refreshTokens = [];
const adminController = {
    
    
    loginAdmin: (req, res) => {
        res.render('administration/loginAdminSite', {title: 'Admin Login'});
    },
    registerAdmin: (req, res) => {
        res.render('administration/registerAdminSite', {title: 'Admin Reister'});
    },
    // Admin Register
    register: async(req, res) => {
        const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);

            // Create user
            const newAdmin = await new Admin({
                username: req.body.username,
                email: req.body.email,
                password: hashed,
            });

        try {
            

            // Save to DB
            await newAdmin.save();

            req.session.message = {
                type: "success",
                message: "User Added Successfully"
            };
            res.redirect("/loginAdmin");
        } catch(err) {
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    //generate Access token
    dashboard: async(req, res) => {
        try {
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId);

            const blogCounts = await Blog.aggregate([
                { $group: { _id: "$faculty", count: { $sum: 1 } } },
                { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
                { $unwind: "$faculty" }
            ]);
            
            const labels = [];
            const data = [];

            blogCounts.forEach(blog => {
                labels.push(blog.faculty.name); // Tên khoa
                data.push(blog.count); // Số lượng blog đã nộp
            });

            const chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Contribution',
                        data: data,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1, // Đặt stepSize là 1 để đảm bảo cột y bắt đầu từ 0 và không có số lẻ
                                precision: 0 // Đặt precision là 0 để loại bỏ số lẻ
                            }
                        }
                        
                    }
                },
            };
            res.render('administration/dashboard', {title: "Admin Dashboard", admin: admin, chartConfig: chartConfig});
        } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    generateAccessToken: (admin) => {
        return jwt.sign({
            id: admin.id,
            isAdmin: admin.isAdmin,
            token:admin
            
        },
            process.env.JWT_ACCESS_TOKEN,
            {
                expiresIn: "30d"
            }
        );
    },
    
    generateRefreshToken: (admin) => {
        return jwt.sign({
            id: admin.id,
            isAdmin: admin.isAdmin,
            token: admin,
        },
            process.env.JWT_REFRESH_KEY,
            {
                expiresIn: "365d"
            }
        );
    },
    // Add faculty
    addFaculty: async (req, res) => {
        try {
            // Create a new faculty object
            const newFaculty = new Faculty({
                name: req.body.name,
            });
            
            // Save the new faculty to the database
            await newFaculty.save();
            
            req.session.message = {
                type: "success",
                message: "Add Faculty Successfully",
            }
            // Send a success response
            res.redirect('/listFaculty');
        } catch (error) {
            req.session.message = {
                type: "success",
                message: "Fail Add Faculty",
            }
            // Send a success response
            res.redirect('/listFaculty');
        }
    },

    listFaculty: async(req, res) => {
        try {
            const faculties = await Faculty.find();
            const admin = await Admin.findOne();
            res.render('administration/listFaculty', { title: 'Faculty', faculties: faculties, admin: admin });
        } catch (err) {
            res.status(500).json({ message: "Internal Server Error"});
        }
    },

    listUser: async(req, res) => {
        try {
            const admin = await Admin.findOne();
            const faculties = await Faculty.find({}, '_id name');
            res.render('administration/listUser', { title: 'Add New Users', admin: admin, roles: roles, faculties: faculties }); // Truyền biến title vào template
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    listStudents: async(req, res) => {
        try {
            const users = await User.find({role:"student"}).populate('faculty');
            const admin = await Admin.findOne(); // Giả sử bạn sử dụng Mongoose để lấy dữ liệu người dùng từ cơ sở dữ liệu
            res.render('administration/students', { title: 'Students', users: users, admin: admin }); // Truyền biến title vào template
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    listCoordinators: async(req, res) => {
        try {
            const users = await User.find({role:"coordinator"}).populate('faculty');
            const admin = await Admin.findOne(); // Giả sử bạn sử dụng Mongoose để lấy dữ liệu người dùng từ cơ sở dữ liệu
            res.render('administration/coordinators', { title: 'Marketing Coordinators', users: users, admin: admin }); // Truyền biến title vào template
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    listManagers: async(req, res) => {
        try {
            const users = await User.find({role:"manager"});
            const admin = await Admin.findOne(); // Giả sử bạn sử dụng Mongoose để lấy dữ liệu người dùng từ cơ sở dữ liệu
            res.render('administration/managers', { title: 'Marketing Manager', users: users, admin: admin }); // Truyền biến title vào template
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    addUser: async (req, res) => {
        // Sử dụng middleware upload
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
    
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            try {
                
               
                // Tạo một đối tượng user mới với dữ liệu từ request
                const newUser = await new User({
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed,
                    role: req.body.role,
                    faculty: req.body.role === "manager" ? null : req.body.faculty,
                    image: req.file ? req.file.filename : null, // Kiểm tra xem req.file có tồn tại không
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                });
                const existingEmail = await User.findOne({ email: req.body.email });
                if (existingEmail) {
                    req.session.messgae = {
                        type: "danger",
                        message: "Email Number already exists",
                    }
                    return res.redirect('/listUser')
                }

                const existingPhoneNumber = await User.findOne({ phoneNumber: req.body.phoneNumber });
                if (existingPhoneNumber) {
                    req.session.messgae = {
                        type: "danger",
                        message: "Phone Number already exists",
                    }
                    return res.redirect('/listUser');
                }

                if(existingEmail && existingPhoneNumber) {
                    req.session.messgae = {
                        type: "danger",
                        message: "Email and Phone Number already exists",
                    }
                    return res.redirect('/listUser');
                }
    
                // Lưu user mới vào cơ sở dữ liệu
                await newUser.save();
    
                req.session.message = {
                    type: "success",
                    message: "User Added Successfully"
                };
                res.redirect("/listUser");
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: err.message, type: "danger" });
            }
        });
    },
    
    

    edit: async (req, res) => {
        try {
            const admin = await Admin.findOne();
            const id = req.params.id;
            const user = await User.findById(id).populate('faculty').exec();
            const faculties = await Faculty.find({}, '_id name');
            
            if (!user) {
                return res.redirect('/listUser');
            }
            res.render("administration/editUser", {
                title: "Edit User",
                user: user,
                admin: admin,
                id: id,
                faculties: faculties,
                roles: roles,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    updated: async (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
            const id = req.params.id;
            let new_image = "";
        
            if (req.file) {
                new_image = req.file.filename;
                try {
                    fs.unlinkSync("./uploads/" + req.body.old_image); // Sửa đường dẫn tới tệp ảnh cũ
                } catch (err) {
                    console.log(err);
                }
            } else {
                new_image = req.body.old_image;
            }
        
            let hashed = req.body.password; // Giữ nguyên mật khẩu nếu không có mật khẩu mới được nhập
            if (req.body.new_password) { // Nếu người dùng nhập mật khẩu mới
                const salt = await bcrypt.genSalt(10);
                hashed = await bcrypt.hash(req.body.new_password, salt); // Hash mật khẩu mới
            }
        
            try {
                const faculty = req.body.faculty ? req.body.faculty : null;
                // Cập nhật thông tin user
                const result = await User.findByIdAndUpdate(id, {
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed, // Sử dụng hashed mật khẩu mới hoặc mật khẩu cũ
                    role: req.body.role,
                    faculty: faculty,
                    image: new_image, // Sử dụng tên tệp mới
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                }).exec();
        
                req.session.message = {
                    type: "success",
                    message: 'User Updated successfully',
                };
                res.redirect('/listUser');
            } catch (err) {
                console.error(err);
                res.json({ message: err.message, type: 'danger' });
            }
        })
    },
    delete: async (req, res) => {
        const id = req.params.id;
        try {
            const user = await User.findOneAndDelete({ _id: id }).exec();
            if (!user) {
                req.session.message = {
                    type: 'error',
                    message: 'User not found',
                };
                return res.redirect('back'); // Redirect back to the previous page
            }
            if (user.image !== '') {
                try {
                    fs.unlinkSync('./uploads/' + user.image);
                } catch (err) {
                    console.log(err);
                }
            }
            req.session.message = {
                type: 'info',
                message: 'User deleted Successfully!',
            };
            res.redirect('/student');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    
    

    reqRefreshToken: async(req, res) => {
        const refreshToken = req.cookie.refreshToken;
        if(!refreshToken) return res.status(401).json("You are not authenticated");
        if(!refreshTokens.includes(refreshToken)) {
            return res.status(403).json("Refresh Token is not valid");
        }
        jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY, (err, admin)=> {
            if(err){
                console.log(err);
            }
            refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
            // create new accesstoken, refreshtoken,
            const newAccessToken = adminController.generateAccessToken(admin);
            const newRefreshToken = adminController.generateRefreshToken(admin);
            refreshTokens.push(newRefreshToken);
            res.cookie("refreshToken", newRefreshToken);

            res.status(200).json({accessToken: newAccessToken});
        })
    },

    logout: async (req, res) => {
        try {
            res.clearCookie("refreshToken");
            refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
            res.clearCookie("accessToken");
            res.redirect("/loginAdmin");
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },

    termsAndConditions: async(req, res) => {
        const admin = await Admin.findOne();
        const terms = await Terms.find();
        res.render('administration/listTerms', {title: "Terms And Conditions", admin: admin, terms: terms});
    },

    addTermsAndConditions: async (req, res) => {
        try {
            // Tạo một bản ghi mới của TermsAndConditions
            const newTermsAndConditions = new Terms({
                content: req.body.termContent, // Sử dụng req.body.termContent thay vì req.body.content
            });
    
            // Lưu bản ghi vào cơ sở dữ liệu
            await newTermsAndConditions.save();
            
            req.session.message = {
                message: 'Terms and conditions added successfully',
                type: "success"
            }
            res.redirect('/listTerms')
        } catch (error) {
            req.session.message = {
                message: 'Terms and conditions added Fail',
                type: "danger"
            }
            res.redirect('/listTerms')
        }
    },
    // Delete Faculty
    deleteFaculty: async (req, res) => {
        const id = req.params.id;
        try {
            const faculty = await Faculty.findByIdAndDelete(id).exec();
            if (!faculty) {
                req.session.message = {
                    type: 'error',
                    message: 'A Faculty not found',
                };
                return res.redirect('back'); // Redirect back to the previous page
            }
            
            req.session.message = {
                type: 'success',
                message: 'Faculty deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editFaculty: async(req, res) => {
        try{
            const facultyId = req.params.id;
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId).exec();
            const faculties = await Faculty.find();

            const faculty = await Faculty.findById(facultyId).exec();


            res.render('administration/editFacultySite', {title: 'Edit Faculty', faculty: faculty, admin: admin, faculties: faculties})
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    updatedFaculty: async(req,res)=>{
        try{
            const id = req.params.id;
            const newName = req.body.name;
            const faculty = await Faculty.findById(id);
        
            if (!faculty) {
                return res.status(404).json({ message: 'Faculty not found' });
            }

        // Update the name
            faculty.name = newName;

        // Save the updated faculty
            await faculty.save();
            req.session.message = {
                type: 'success',
                message: 'Updated Successfully'
            }
            res.redirect('/listFaculty');
        }catch(err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    deleteTerms: async (req, res) => {
        const id = req.params.id;
        try {
            const term = await Terms.findByIdAndDelete(id).exec();
            if (!term) {
                req.session.message = {
                    type: 'error',
                    message: 'Terms not found',
                };
                return res.redirect('back'); // Redirect back to the previous page
            }
            
            req.session.message = {
                type: 'info',
                message: 'Term deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    deleteAcademy: async (req, res) => {
        try {
            const id = req.params.id;
            const academy = await Academy.findByIdAndDelete(id).exec();

            if (!academy) {
                req.session.message = {
                    type: 'error',
                    message: 'Academy not found',
                };
                return res.redirect('back'); // Redirect back to the previous page
            }
            req.session.message = {
                type: 'info',
                message: 'Academy deleted Successfully!',
            };
            res.redirect('back');
        } catch (err) {
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editAcademySite: async(req, res) => {
        try {
            const adminId = req.adminId;
            const admin = await Admin.findById(adminId).exec();
            const academyId = req.params.id;
            const academy = await Academy.findById(academyId).exec();

            if(!admin) {
                res.status(400).json({ message: "Not Found Administrator" });
            }
            if(!academy) { 
                res.status(400).json({ message: "Not Found Academy" });
            }
            res.render('administration/editAcademySite', {title: "Edit Academy", academy: academy, admin: admin});
        } catch(err) {
            res.status(400).json({ message: err.message });
        }
    },

    editAcademy: async (req, res) => {
        try {
            const academyId  = req.params.id; // Lấy ID của Academy từ params
            const { name, description, startDate, endDate } = req.body; // Lấy thông tin mới từ body request
    
            // Kiểm tra xem Academy có tồn tại không
            const existingAcademy = await Academy.findById(academyId);
            console.log(existingAcademy);
            if (!existingAcademy) {
                return res.status(404).json({ message: 'Academy not found' });
            }
            
            
            // Cập nhật thông tin Academy
            existingAcademy.name = name;
            existingAcademy.description = description;
            existingAcademy.startDate = startDate;
            existingAcademy.endDate = endDate;
    
            // Lưu thông tin Academy đã cập nhật vào database
            const updatedAcademy = await existingAcademy.save();
    
            // Gửi thông báo thành công và chuyển hướng người dùng đến trang chỉnh sửa Academy
            req.session.message = {
                type: "success",
                message: "Edit Academy Successfully",
            }
            res.redirect(`/editAcademy/${academyId}`);
        } catch (error) {
            // Xử lý lỗi nếu có
            res.status(400).json({ message: error.message });
        }
    },
    
    
};

module.exports = adminController;