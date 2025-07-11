import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
	#PRICES = {ADULT: 25, CHILD: 15, INFANT: 0};

  /**
   * Sum all the seats in the given requests list
   * 
   * @param {Array} requests 
   * 
   * @returns {Number} total number of seats
   */
	#sumTickets(requests) {
		return requests.reduce(
			(acc, ticket) => acc + ticket.getNoOfTickets(),
			0,
		);
	}

	/**
   * Get all ticket requests matching the given type of ticket
   *
   * @param ticketTypeRequests, array of ticketTypeRequests
   * @param type, the type to filter on
   *
   * @returns all ticket type requests matching the given type
   */
	#filterByType(ticketTypeRequests, type) {
		return ticketTypeRequests.filter(request => request.getTicketType() === type);
	}

	/**
   * Calculate whether the given list of ticket requests are valid
   * 
   * Tickets are valid if:
   * <ul>
   *   <li>There is at least one adult; and</li>
   *   <li>There are as many infants as children</li>
   * </ul>
   * 
   * @param {*} ticketTypeRequests
   * @returns
   */
	#isRequestValid(ticketTypeRequests) {
		const adultTickets = this.#filterByType(ticketTypeRequests, 'ADULT');
		const infantTickets = this.#filterByType(ticketTypeRequests, 'INFANT');

		const adultSum = this.#sumTickets(adultTickets);
		const asManyInfantsAsAdult = adultSum >= this.#sumTickets(infantTickets);

		return adultSum > 0 && asManyInfantsAsAdult;
	}

  /**
   * Calculate the cost of a given ticket request
   * 
   * @param {Object} ticketTypeRequest, the ticket request
   * 
   * @returns {Number}, the cost
   */
	#calculateCostOfTicketRequest(ticketTypeRequest) {
		const type = ticketTypeRequest.getTicketType();
		const price = this.#PRICES[type];
		return price * ticketTypeRequest.getNoOfTickets();
	}

  /**
   * Calculate number of seats required for a single ticket type request 
   * 
   * @param {Object} ticketTypeRequest, the request to calculate the seats for
   * 
   * @returns {Number}, the number of seats for this request 
   */
	#calculateSeatForTicketRequest(ticketTypeRequest) {
		const isInfant = ticketTypeRequest.getTicketType() === 'INFANT';
		/* Infants share with their parents */
		return isInfant ? 0 : ticketTypeRequest.getNoOfTickets();
	}

	/**
   * Calculate the number of seats for the given requests, and calculate the 
   * cost of those tickets
   * 
   * @param {Array} ticketTypeRequests, an array of ticket types
   * 
   * @returns {Object}, with a seats property and cost property
   */
	#calculatePriceAndSeats(ticketTypeRequests) {
		let totalCost = 0;
		let totalSeats = 0;

		for (let i = 0; i < ticketTypeRequests.length; i++) {
			totalCost += this.#calculateCostOfTicketRequest(ticketTypeRequests[i]);
			totalSeats += this.#calculateSeatForTicketRequest(ticketTypeRequests[i]);
		}

		return {cost: totalCost, seats: totalSeats};
	}

	/**
   * Make a payment using the given account
   *
   * @param {Number} accountId
   * @param {Number} costToPay
   *
   * @returns {Boolean}, true if payment was taken successfully
   */
	#payCost(accountId, costToPay) {
		const paymentService = new TicketPaymentService();
		let result;

		try {
			paymentService.makePayment(accountId, costToPay);
			result = true;
		} catch (_) {
			result = false;
		}

		return result;
	}

	/**
   * Reserve seats for the given account
   *
   * @param {Number} accountId
   * @param {Number} seats
   *
   * @returns {Boolean}, true if seats were successfully reserved
   */
	#reserveSeats(accountId, seats) {
		const reservationService = new SeatReservationService();
		let result;

		try {
			reservationService.reserveSeat(accountId, seats);
			result = true;
		} catch (_) {
			result = false;
		}

		return result;
	}

	/**
   * Purchase the given request objects with the given account ID
   *
   * If the given request is valid, and the seat reservation succeeds, and
   * the payments go through, return true
   *
   * If the requests are invalid, throw an InvalidPurchaseException with
   * an explanation of why
   *
   * @param {Number} accountId, the ID to charge the cost to
   * @param  {...TicketTypeRequest} ticketTypeRequests, the requests to process
   * @returns
   */
	purchaseTickets(accountId, ...ticketTypeRequests) {
		if (!Number.isInteger(accountId) || accountId < 1) {
			throw new InvalidPurchaseException(`Invalid account ID ${accountId}`);
		}

		const totalTickets = this.#sumTickets(ticketTypeRequests);
		if (totalTickets <= 0 || totalTickets > 25) {
			throw new InvalidPurchaseException(`${totalTickets} invalid, needs to be between 1 and 25`);
		}

		if (!this.#isRequestValid(ticketTypeRequests)) {
			throw new InvalidPurchaseException('Not enough adults for number of children/infants');
		}

		const {cost, seats} = this.#calculatePriceAndSeats(ticketTypeRequests);

		/* Ensure that the seat reservation succeeds before charging customer */
		return this.#reserveSeats(accountId, seats) && this.#payCost(accountId, cost);
	}
}
