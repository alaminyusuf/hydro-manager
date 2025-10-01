const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')
const Expense = require('../models/Expense')

// @desc    Get all expenses and incomes for a user
// @route   GET /api/expenses
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
	// req.user.id is set by authMiddleware
	const transactions = await Expense.find({ user: req.user.id })
		.sort({ date: -1 })
		.populate('batch', 'name') // Fetch the batch name for display
	res.json(transactions)
})

// @desc    Add a new expense or income
// @route   POST /api/expenses
// @access  Private
const addTransaction = asyncHandler(async (req, res) => {
	const { amount, category, isIncome, description, date, batch } = req.body

	if (!amount || !category || typeof isIncome !== 'boolean') {
		res
			.status(400)
			.send(
				'Please include all required fields: amount, category, and type.'
			)
	}

	const transaction = await Expense.create({
		user: req.user.id,
		amount,
		category,
		isIncome,
		description,
		date,
		// Only include batch ID if one was provided in the request body
		batch: batch || undefined,
	})

	res.status(201).json(transaction)
})

// @desc    Get financial summary (MVP Dashboard Analytics)
// @route   GET /api/expenses/summary
// @access  Private
const getSummary = asyncHandler(async (req, res) => {
	const userId = req.user.id
	const userObjectId = new mongoose.Types.ObjectId(userId)

	// Use MongoDB Aggregation Pipeline for fast calculations
	const summary = await Expense.aggregate([
		{ $match: { user: userObjectId } }, // 1. Filter by current user
		{
			$group: {
				_id: null,
				// Calculate overall totals
				totalIncome: { $sum: { $cond: ['$isIncome', '$amount', 0] } },
				totalExpenses: { $sum: { $cond: ['$isIncome', 0, '$amount'] } },
			},
		},
		// Optional: Project to clean up the output fields
		{
			$project: {
				_id: 0,
				totalIncome: 1,
				totalExpenses: 1,
				balance: { $subtract: ['$totalIncome', '$totalExpenses'] },
			},
		},
	])

	// Calculate expense breakdown by category for the chart
	const expensesByCategory = await Expense.aggregate([
		{ $match: { user: userObjectId, isIncome: false } }, // 1. Filter user and expenses only
		{ $group: { _id: '$category', total: { $sum: '$amount' } } }, // 2. Group and sum by category
		{ $sort: { total: -1 } }, // 3. Sort descending
	])

	// Send the combined data
	res.json({
		financialSummary: summary[0] || {
			totalIncome: 0,
			totalExpenses: 0,
			balance: 0,
		},
		expensesByCategory,
	})
})

module.exports = { getTransactions, addTransaction, getSummary }
