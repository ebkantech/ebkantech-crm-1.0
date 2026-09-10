// Every model keys its documents with the app's own string ids (e.g. "l1",
// "t1a") instead of a generated ObjectId, since leads/tasks/projects already
// reference each other by these ids. toJSON just exposes _id as `id`.
export const idSchemaOptions = {
  versionKey: false,
  toJSON: {
    virtuals: false,
    transform: (_doc, ret) => {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  },
};
