const AppError = require("../utils/appError");

const handleCastError = err => {
  const message = `Invalid ${err.path}: ${err.value}.`
  return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/);
  const value = err.keyValue.name;
  // console.log(value, 'value')
  const message = `Duplicate field value: "${value}", Please use another value`;
  return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message,400);
}

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleTokenExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    stack: err.stack,
    message: err.message,
  });
};

const sendErrorProd = (err, res) => {
  // console.log(err.isOperational);
  // Operational, trusted error: send message to client
  if(err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
    // Programing or other unknown error: don't leak error details
  }else {
    // 1)Log error
    console.log('ERROR', err);
    // 2) send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    })
  }
};


module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = {...err};
    if(error.name === 'CastError') error = handleCastError(error);
    if(error.code === 11000) error = handleDuplicateFieldsDB(error);
    if(error?.errors) error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if(error.name === 'TokenExpiredError') error = handleTokenExpiredError();
    sendErrorProd(error, res);
  }
};
