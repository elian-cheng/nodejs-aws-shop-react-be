import Joi from 'joi';

export interface IProduct {
  id: string;
  title: string;
  description: string;
  price: number;
}

export interface IStock {
  product_id: string;
  count: number;
}

const ProductSchema = Joi.object({
  id: Joi.string().required().max(30),
  title: Joi.string().required().max(50),
  description: Joi.string().required().max(500),
  price: Joi.number().integer().positive().required(),
  count: Joi.number().integer().positive().required(),
});

export default ProductSchema;
