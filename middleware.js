const jwt = require("jsonwebtoken");
module.exports = function (req, res, next) {
  try {
    const token = req.header("x-token");
    if (!token) {
      return res.status(4000).send("token not found");
    }
    let decode = jwt.verify(token, "venkatesh");
    req.user = decode.user;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "server error" });
  }
};
