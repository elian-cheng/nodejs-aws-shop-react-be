import Joi from 'joi';

export interface IProduct {
  id: string;
  title: string;
  description: string;
  price: number;
}

const ProductSchema = Joi.object({
  id: Joi.string().required().max(30),
  title: Joi.string().required().max(50),
  description: Joi.string().required().max(500),
  price: Joi.number().positive().required().precision(2),
});

export default ProductSchema;
