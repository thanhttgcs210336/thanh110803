const bcrypt = require('bcrypt');
const { User, roles } = require('../models/user');
const multer = require('multer');
const fs = require('fs');

const Academy = require('../models/academy');
const Blog = require('../models/blog');
const Faculty = require('../models/faculty');


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

const managerController = {
    listBlog: async (req, res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            const academy = await Academy.find();
            const faculty = await Faculty.find();

            let blogs = [];
            if(user.role === 'manager') {
                blogs = await Blog.find().populate('faculty academy user');
            } else if(user.role === 'guest') {
                blogs = await Blog.find({status: 'publish'}).populate('faculty academy user');
            }

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: null,
                selectedFaculty:null,
                faculty: faculty,
                blogs: blogs
            });
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }

    },

    selectFaculty: async(req, res) => { 
        try{
            const userId = req.userId;
            const user = await User.findById(userId).exec();
            const facultyId = req.params.facultyId;
            const faculties = await Faculty.findById(facultyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();
            const blogs = await Blog.find({faculty: facultyId}).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: null,
                selectedFaculty: faculties,
                faculty: faculty,
                facultyId: facultyId,
                blogs: blogs,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },
    selectAcademy: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const { facultyId, academyId } = req.params;

            const faculties = await Faculty.findById(facultyId);
            const academies = await Academy.findById(academyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();

            const blogs = await Blog.find({faculty: facultyId, academy: academyId , status: 'publish'}).populate('faculty academy user');
            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: faculties,
                faculty: faculty,
                facultyId: facultyId,
                academyId: academyId,
                blogs: blogs,
            });
        } catch (err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    selectAcademyOnly: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const { academyId } = req.params;

            const academies = await Academy.findById(academyId);

            const faculty = await Faculty.find()
            const academy = await Academy.find();

            const blogs = await Blog.find({ academy: academyId }).populate('faculty academy user');
            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: null,
                faculty: faculty,
                blogs: blogs,
                academyId: academyId,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    facultyAndAcademy: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId).exec();

            const { facultyId, academyId } = req.params;


            const academies = await Academy.findById(academyId);
            const faculties = await Faculty.findById(facultyId);

            const faculty = await Faculty.find();
            const academy = await Academy.find();

            const blogs = await Blog.find({ academy: academyId, faculty: facultyId }).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager Views",
                user: user,
                academy: academy,
                selectedAcademy: academies,
                selectedFaculty: faculties,
                faculty: faculty,
                blogs: blogs,
                academyId: academyId, 
                facultyId: facultyId,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    selectStatus: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);

            const academy = await Academy.find();
            const faculty = await Faculty.find();
            const status = req.query.status;
            if (!status) {
                throw new Error("Status parameter is missing");
            }
            const blogs = await Blog.find({status: status}).populate('faculty academy user');

            res.render('users/managerView', {
                title: "Manager View",
                blogs: blogs,
                selectedAcademy: null,
                user: user,
                academy: academy,
                faculty: faculty,
                
                selectedFaculty: null,
            });
        } catch(err) {
            res.status(500).json({ err: 'Internal server error' });
        }
    },

    filterStatus: async (req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);

            const { facultyId, academyId } = req.params;
            const status = req.query.status;

            if (!status) {
                throw new Error("Status parameter is missing");
            }

            const blogs = await Blog.find({ academy: academyId, status: status, faculty: facultyId }).populate('faculty academy user');
            const academies = await Academy.findById(academyId).exec();
            const faculties = await Faculty.findById(facultyId).exec();
            const academy = await Academy.find();
            const faculty = await Faculty.find()

            res.render('users/managerView', {
                title: "Manager View",
                blogs: blogs,
                selectedAcademy: academies,
                user: user,
                academy: academy,
                faculty: faculty,
                facultyId: facultyId,
                academyId: academyId,
                selectedFaculty: faculties,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    listGuest: async(req, res) => {
        try {
            const userId = req.userId;
            const user = await User.findById(userId);

            const guest = await User.find({role: 'guest'});

            res.render('users/guestList', {title: 'List Guest', guest: guest, user: user});
        } catch(err) {
            res.status(500).json({ message: err.message });
        }
    },

    addGuestSite: async (req, res) => {
        try{
            const userId = req.userId;
            const user = await User.findById(userId);

            res.render('users/guestAddSite', {title: 'Add New Guest', user: user});
        } catch(err) {
            res.status(500).json({ message: err.message });
        }
    },

    addGuest: async (req, res) => {
        // Sử dụng middleware upload
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: err.message, type: "danger" });
            }
    
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);
            try {
                
                // Tạo một đối tượng user mới với dữ liệu từ request
                const newUser = new User({
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed,
                    role: 'guest',
                    faculty: null,
                    image: req.file ? req.file.filename : null, // Kiểm tra xem req.file có tồn tại không
                    phoneNumber: req.body.phoneNumber,
                    gender: req.body.gender,
                    city: req.body.city,
                });
    
                // Lưu user mới vào cơ sở dữ liệu
                await newUser.save();
    
                req.session.message = {
                    type: "success",
                    message: "Guest Added Successfully"
                };
                res.redirect("/addGuestSite");
            } catch (err) {
                console.log(err);
                res.status(500).json({ message: err.message, type: "danger" });
            }
        });
    },
    
    deleteGuest: async (req, res) => {
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
            res.redirect('/listGuest');
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },

    editGuestSite: async (req, res) => {
        try {
            const userId = req.userId;
            const manager = await User.findById(userId).exec();
            const id = req.params.id;
            const user = await User.findById(id).exec();
            
            if (!user) {
                return res.redirect('/listGuest');
            }
            res.render("users/guestEditSite", {
                title: "Edit Guest",
                users: user,
                user: manager,
                id: id,
            
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    },
    updateGuest: async (req, res) => {
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
                // Cập nhật thông tin user
                const result = await User.findByIdAndUpdate(id, {
                    username: req.body.username,
                    email: req.body.email,
                    password: hashed, // Sử dụng hashed mật khẩu mới hoặc mật khẩu cũ
                    role: 'guest',
                    faculty: null,
                    image: new_image, // Sử dụng tên tệp mới
                    phoneNumber: req.body.phonenumber,
                    gender: req.body.gender,
                    city: req.body.city,
                }).exec();


        
                req.session.message = {
                    type: "success",
                    message: 'User Updated successfully',
                };
                res.redirect(`/editGuest/${id}`);
            } catch (err) {
                console.error(err);
                res.json({ message: err.message, type: 'danger' });
            }
        })
    },
};

module.exports = managerController;