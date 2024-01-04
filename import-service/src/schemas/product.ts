import Joi from 'joi';

const ProductSchema = Joi.object({
  title: Joi.string().required().max(30),
  description: Joi.string().required().max(500),
  price: Joi.number().positive().required().precision(2),
  count: Joi.number().positive().integer().required(),
  image: Joi.string().required().max(150),
});

export default ProductSchema;
