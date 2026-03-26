const { z } = require("zod");

const emailSchema = z
  .string({ required_error: "Email is required." })
  .trim()
  .email("Invalid email format.")
  .transform((value) => value.toLowerCase());

const registerSchema = z.object({
  name: z.string({ required_error: "Name is required." }).trim().min(1, "Name is required."),
  email: emailSchema,
  password: z.string({ required_error: "Password is required." }).min(6, "Password must be at least 6 characters long."),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Password is required." }).min(1, "Password is required."),
});

const createTaskSchema = z.object({
  subject: z.string({ required_error: "Subject is required." }).trim().min(1, "Subject is required."),
  type: z.enum(["zadatak", "ispit"], {
    errorMap: () => ({ message: "Invalid obligation type." }),
  }),
  title: z.string({ required_error: "Title is required." }).trim().min(1, "Title is required."),
  dueDate: z.string({ required_error: "Due date is required." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format."),
});

const patchTaskSchema = z.object({
  completed: z.boolean({ required_error: "Field 'completed' must be boolean." }),
});

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month. Format must be YYYY-MM."),
});

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  patchTaskSchema,
  monthQuerySchema,
};
