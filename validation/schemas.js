const { z } = require("zod");

function isFutureOrToday(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

const taskStatusSchema = z.enum(["todo", "in_progress", "done"], {
  errorMap: () => ({ message: "Status must be one of: todo, in_progress, done." }),
});

const taskPrioritySchema = z.enum(["low", "medium", "high"], {
  errorMap: () => ({ message: "Priority must be one of: low, medium, high." }),
});

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
  description: z.string().trim().max(300, "Description must be at most 300 characters.").optional().default(""),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("todo"),
  dueDate: z
    .string({ required_error: "Due date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format.")
    .refine(isFutureOrToday, "Due date must be today or in the future."),
});

const patchTaskSchema = z
  .object({
    status: taskStatusSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.status !== undefined || value.completed !== undefined, {
    message: "Provide either 'status' or 'completed'.",
  });

const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month. Format must be YYYY-MM."),
});

const taskFilterQuerySchema = z.object({
  subject: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: taskPrioritySchema.optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createTaskSchema,
  patchTaskSchema,
  monthQuerySchema,
  taskFilterQuerySchema,
  taskStatusSchema,
  taskPrioritySchema,
};
