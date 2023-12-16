import Joi from 'joi';

const ImportUrl = Joi.object({
  name: Joi.string().required(),
});

export default ImportUrl;
