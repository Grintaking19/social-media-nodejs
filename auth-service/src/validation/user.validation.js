import joi from "joi";

// Schema for creating a user (User Registration)
const validateRegistration = (data) => {
  const schema = joi.object({
    username: joi.string().alphanum().min(3).max(30).required(),
    email: joi.string().email().required(),
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    password: joi
      .string()
      .min(8)
      .max(30)
      .pattern(
        new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*_])"),
      )
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters",
        "string.max": "Password must be at most 30 characters",
        "any.required": "Password is required",
        "string.pattern.base":
          "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)",
      }),
    confirmPassword: joi.any().valid(joi.ref("password")).required().messages({
      "any.only": "Passwords do not match",
    }),
  });
  return schema.validate(data);
};

// Schema Validation for User Login
const validateLogin = (data) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).required(),
  });
  return schema.validate(data);
};

export { validateRegistration, validateLogin };
