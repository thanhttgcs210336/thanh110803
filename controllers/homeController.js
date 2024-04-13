const bcrypt=require('bcrypt');
const Admin = require('../models/admin');
const {User, roles} = require('../models/user'); // Đảm bảo đường dẫn đúng tới tệp model User
const jwt = require('jsonwebtoken');
const Blog = require('../models/blog');



let refreshTokens = [];

const getBlogCountsByFaculty = async (facultyId) => {
    const blogCounts = await Blog.aggregate([
        { $match: { faculty: facultyId } },
        { $group: { _id:  {status: "$status"} , count: { $sum: 1 } } },
    ]);

    return blogCounts;
};


// Hàm để lấy số lượng blog của tất cả các khoa
const getAllBlogCounts = async () => {
    const blogCounts = await Blog.aggregate([
        { $group: { _id: "$faculty", count: { $sum: 1 } } },
        { $lookup: { from: 'faculties', localField: '_id', foreignField: '_id', as: 'faculty' } },
        { $unwind: "$faculty" }
    ]);
    return blogCounts;
};

const homeController = {
    homePage: async (req, res) => {
        const userId = req.userId;
        const user = await User.findById(userId);
        res.render('users/index', {title: "Home Page", user: user});
    },

    loginedHome: async (req, res) => {
        const userId = req.userId; 
        const user = await User.findById(userId);

        let blogCounts = [];

        // Xác định khoa của sinh viên và coordinator
        let facultyId;
        let chartConfig;
        if (user.role === 'student' || user.role === 'coordinator') {
            facultyId = user.faculty; // Giả sử facultyId được lưu trữ trong user
            blogCounts = await getBlogCountsByFaculty(facultyId);

           

            const labels = [];
            const dataPending = [];
            const dataPublished = [];
            const dataRejected = [];

            blogCounts.forEach(blog => {
                labels.push(blog._id.status); // Tên trạng thái
                if (blog._id.status === "pending") {
                    dataPending.push(blog.count); // Số lượng bài đăng ở trạng thái pending
                } else if (blog._id.status === "publish") {
                    dataPublished.push(blog.count); // Số lượng bài đăng ở trạng thái published
                } else if (blog._id.status === "rejected") {
                    dataRejected.push(blog.count);
                }
            });

            chartConfig = {
                type: 'bar',
                data: {
                    labels: ['Rejected', 'Pending', 'Published'],
                    datasets: [
                        {
                            label: 'status',
                            data: [dataRejected, dataPending, dataPublished], // Dữ liệu của tập dữ liệu thứ nhất (ví dụ: số lượng đóng góp ở trạng thái pending)
                            backgroundColor:  [
                                'rgba(255, 99, 132, 0.2)',
                                'rgba(54, 162, 235, 0.2)',
                                'rgba(75, 192, 192, 0.2)',
                            ], // Màu cho trạng thái pending
                            borderColor: [
                                'rgba(255, 99, 132, 1)',
                                'rgba(54, 162, 235, 1)',
                                'rgba(75, 192, 192, 1)'
                            ],
                            borderWidth: 1
                        },
                    ]
                },
                options: {
                    // Cấu hình của biểu đồ
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1, // Đặt stepSize là 1 để đảm bảo cột y bắt đầu từ 0 và không có số lẻ
                                precision: 0 // Đặt precision là 0 để loại bỏ số lẻ
                            }
                        }
                        
                    }
                }
            };
        } else {
            // Trường hợp khác, thống kê tất cả các khoa
            blogCounts = await getAllBlogCounts();

            const labels = [];
            const data = [];

            blogCounts.forEach(blog => {
                labels.push(blog.faculty.name); // Tên khoa
                data.push(blog.count); // Số lượng blog
            });

            chartConfig = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Number of Contribution',
                            data: data, // Dữ liệu của tập dữ liệu thứ nhất
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        },
                        // Thêm nhiều tập dữ liệu khác nếu cần
                    ]
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
                }
            };
        }
        
        res.render('users/homePage', {title: "Home Page to Submit", user: user, chartConfig: chartConfig});
    },

    loginUser: (req, res) => {
        res.render('users/loginUserSite', {title: "Log In"});
    },

    generateAccessToken: (user) => {
        return jwt.sign({
            id: user._id,
            role: user.role,
            token: user,
            isAdmin: user.isAdmin,
        },
            process.env.JWT_ACCESS_TOKEN,
            {
                expiresIn: "30d"
            }
        );
    },
    
    generateRefreshToken: (user) => {
        return jwt.sign({
            id: user._id,
            role: user.role,
            token: user,
            isAdmin: user.isAdmin,
        },
            process.env.JWT_REFRESH_KEY,
            {
                expiresIn: "365d"
            }
        );
    },

    login: async(req, res) => {
        try {
            req.session.userLoggedIn = false;
            const user = await User.findOne({ email: req.body.email});
            const admin = await Admin.findOne({ email: req.body.email });

            if(!user && !admin) {
                return res.render('users/loginUserSite', { message: { type: 'danger', message: 'Invalid Email' }, title: 'Log In' });
            }

            let validPassword = false;
            let loggedInUser = null;

            if (user) {
                validPassword = await bcrypt.compare(req.body.password, user.password);
                loggedInUser = user;
            } else if (admin) {
                validPassword = await bcrypt.compare(req.body.password, admin.password);
                loggedInUser = admin;
            } 

            if(!validPassword){
                return res.render('users/loginUserSite', { message: { type: 'danger', message: 'Wrong Password' }, title: 'Log In' });
            } 
              

            if (loggedInUser) {
                const accessToken = homeController.generateAccessToken(loggedInUser);
                const refreshToken = homeController.generateRefreshToken(loggedInUser);
                res.cookie("refreshToken", refreshToken);
                res.cookie("accessToken", accessToken);
    
                if (user) {
                    res.redirect('/homePage');
                } else if (admin) {
                    res.redirect('/dashboard');
                } 
            }
        } catch(err) {
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    logout: async (req, res) => {
        try {
            res.clearCookie("refreshToken");
            refreshTokens = refreshTokens.filter(token => token !== req.cookies.refreshToken);
            res.clearCookie("accessToken");
            res.redirect("/loginUser");
        } catch (err) {
            console.log(err);
            res.status(500).json({ message: err.message, type: "danger" });
        }
    },
    
}

module.exports = homeController