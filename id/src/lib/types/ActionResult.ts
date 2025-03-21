// When a server action is successful, it may return a data object. Often it
// also has to return an input object, which is the same as the input object
// passed to the function. This is needed for form rehydration. If both data and
// input are not needed, the function can return undefined.
type ActionSuccess<T, Input> = [Input] extends [undefined]
  ? [T] extends [undefined]
    ? undefined
    : { data: T; error?: never }
  : [T] extends [undefined]
    ? { input: Input; error?: never }
    : { input: Input; data: T; error?: never };

// When a server action fails, it returns an error object. This object is
// specific to the action. The input object is also returned, just like in the
// success case.
type ActionFailure<T, Err, Input> = [Input] extends [undefined]
  ? [T] extends [undefined]
    ? { error: Err }
    : { data?: never; error: Err }
  : [T] extends [undefined]
    ? { input: Input; error: Err }
    : { input: Input; error: Err; data?: never };

// The ActionResult type is a union of the success and failure types. It is used
// to define the return type of server actions, usually called via
// `useActionState`, and supports form rehydration, field-level errors, and
// optional success data.
//
// Example:
//
// ```ts
// type Error = { firstName?: "required"; lastName?: "tooShort" };
// type Input = { firstName: string; lastName: string };
// type Data = { success: true };
// type Result = ActionResult<Data, Error, Input>;
//
// // Result could be:
// // { input, data: { success: true } }
// // { input, error: { firstName: "required" } }
// ```
export type ActionResult<T = undefined, Err = undefined, Input = undefined> =
  | ActionSuccess<T, Input>
  | ([Err] extends [undefined] ? never : ActionFailure<T, Err, Input>);

export type FormErrors = { [key: string]: string | undefined };
export type FormInput = { [key: string]: string };
export type BasicFormAction = ActionResult<undefined, FormErrors, FormInput>;
