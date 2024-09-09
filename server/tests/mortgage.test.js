const request = require('supertest');
const express = require('express');
const mortgageRouter = require('../mortgage');

const app = express();
app.use(express.json());
app.use('/api', mortgageRouter);

describe('POST /api/calculate-mortgage', () => {
  
  it('should calculate mortgage payment with valid inputs', async () => {
    const res = await request(app)
      .post('/api/calculate-mortgage')
      .send({
        propertyPrice: 500000,
        downPayment: 50000,
        annualInterestRate: 3,
        amortizationPeriod: 25,
        paymentSchedule: 'monthly'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('mortgagePayment');
    expect(res.body).toHaveProperty('cmhcInsurance');
  });

  describe('Should return error is inputs are invalid', () => {

    it('should give error if any input is missing', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'All fields are required');
    });
    
    it('should give error if downpayment is not less than property price', async () => {
      let price  = 400000;
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: price,
          downPayment: price,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid inputs');
    }); 

    it('should give error if any value is negative', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: -3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Property price, down payment, amortization period and annual interest rate must be positive numbers');
    });    

    it('should give error if payment schedule is not a string', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 1
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Payment schedule must be string');
    });
    
    it('should give error if price, downPayment, amortization period or interest is not a number', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 'qwerty',
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 1
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Property price, down payment, amortization period and annual interest rate must be positive numbers');
    });    

  })

  describe('Validate down payments', () => {
    
    it('should return error when down payment is less than 5%', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 400000,
          downPayment: 1000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Downpayment is too low!');
    });

    it('should return error code when down payment is 5% and price is more than 500,000', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 600000,
          downPayment: 30000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Downpayment is too low!');
    });

    it('should return 200 when down payment is equal to 5% and price is less than 500,000', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 400000,
          downPayment: 20000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('mortgagePayment');
      expect(res.body).toHaveProperty('cmhcInsurance');
    });

    it('should fail if downpayment is less than or equal to 20% and price is more than $1,000,000', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 1100000,
          downPayment: 0.2*1100000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Downpayment is too low!');
    });

  })

  describe('Validate Amortization periods', () => {

    it('should return error when amortization period is above 30', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 35,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid Amortization Period!');
    });

    it('should return error when amortization period is not 5, 10, 15, 20, 25 or 30', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 12,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid Amortization Period!');
    });

    it('Should not have over 25 years amortization if down payment is less than 20%', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 400000,
          downPayment: 0.19*400000,
          annualInterestRate: 3,
          amortizationPeriod: 30,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid Amortization Period!');
    });

    it('Should have atleast 20% down payment if amortization period is more than 25', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 400000,
          downPayment: 0.20*400000,
          annualInterestRate: 3,
          amortizationPeriod: 30,
          paymentSchedule: 'monthly'
        });
  
      expect(res.statusCode).toEqual(200);
    });

  });

  describe('Validate payment schedule', () => {

    it('should return error if payment schedule is invalid', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 20,
          paymentSchedule: 'bi-monthly'
        });
  
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Payment schedule is invalid!');
    });

    it('should treat payment schedule as case insensitive', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 50000,
          annualInterestRate: 3,
          amortizationPeriod: 20,
          paymentSchedule: 'Bi-Weekly'
        });
  
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('mortgagePayment');
      expect(res.body).toHaveProperty('cmhcInsurance');
    });

  });

  describe('Validate CMHC insurance as per guidelines', () => {
    let propertyPrice = 300000;

    it('Down payment in range 10% to 14.99% should have 3.1% CMHC insurance', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: propertyPrice,
          downPayment: 0.1*propertyPrice,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      const expectedCmhcInsurance = 3.1*(propertyPrice-0.1*propertyPrice)/100;
      expect(parseFloat(res.body.cmhcInsurance)).toBeCloseTo(expectedCmhcInsurance, 2);
    });

    it('Down payment in range 5% to 9.99% should have 4% CMHC insurance', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: propertyPrice,
          downPayment: 0.05*propertyPrice,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      const expectedCmhcInsurance = 4*(propertyPrice-0.05*propertyPrice)/100;
      expect(parseFloat(res.body.cmhcInsurance)).toBeCloseTo(expectedCmhcInsurance, 2);
    });

    it('Down payment in range 15% to 19.99% should have 2.8% CMHC insurance', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: propertyPrice,
          downPayment: 0.15*propertyPrice,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      const expectedCmhcInsurance = 2.8*(propertyPrice-0.15*propertyPrice)/100;
      expect(parseFloat(res.body.cmhcInsurance)).toBeCloseTo(expectedCmhcInsurance, 2);
    });

    it('Down payment of 20% or more should have 0% CMHC insurance', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: propertyPrice,
          downPayment: 0.2*propertyPrice,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      const expectedCmhcInsurance = 0;
      expect(parseFloat(res.body.cmhcInsurance)).toBeCloseTo(expectedCmhcInsurance, 2);
    });
    
    it('Down payment of less than 20% should have CMHC insurance', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: propertyPrice,
          downPayment: 0.19*propertyPrice,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      expect(parseFloat(res.body.cmhcInsurance)).toBeGreaterThan(0);
    });

    it('CMHC insurance is 0 if property price is more than $1 million', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 1100000,
          downPayment: 0.25*1100000,
          annualInterestRate: 3,
          amortizationPeriod: 25,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      expect(parseFloat(res.body.cmhcInsurance)).toBe(0);
    });

    it('CMHC insurance is 0 if amortization period is more than 25 years', async () => {
      const res = await request(app)
        .post('/api/calculate-mortgage')
        .send({
          propertyPrice: 500000,
          downPayment: 0.2*500000,
          annualInterestRate: 3,
          amortizationPeriod: 30,
          paymentSchedule: 'Monthly'
        });
    
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('cmhcInsurance');
      expect(parseFloat(res.body.cmhcInsurance)).toBe(0);
    });

  });

});
