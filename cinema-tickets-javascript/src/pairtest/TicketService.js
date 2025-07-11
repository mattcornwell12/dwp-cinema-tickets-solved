import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

export default class TicketService {
	#PRICES = {ADULT: 25, CHILD: 10, INFANT: 0};

  #sumTickets(requests) {
    return requests.reduce(
      (acc, ticket) => acc + ticket.getNoOfTickets(),
      0
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
    return ticketTypeRequests.filter((request) => {
      return request.getTicketType() === type;
    });
  }

  /**
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

	#calculateCostOfTicketRequest(ticketTypeRequest) {
		const type = ticketTypeRequest.getTicketType();
		const price = this.#PRICES[type];
		return price * ticketTypeRequest.getNoOfTickets();
	}

	#calculateSeatForTicketRequest(ticketTypeRequest) {
		const isInfant = ticketTypeRequest.getTicketType() === 'INFANT';
		return isInfant ? 0 : ticketTypeRequest.getNoOfTickets();
	}

	#calculatePriceAndSeats(ticketTypeRequests) {
		let totalCost = 0;
		let totalSeats = 0;

		for (const i in ticketTypeRequests) {
			totalCost += this.#calculateCostOfTicketRequest(ticketTypeRequests[i]);
			totalSeats += this.#calculateSeatForTicketRequest(ticketTypeRequests[i]);
		}

		return {cost: totalCost, seats: totalSeats};
	}

	#payCost(accountId, costToPay) {
		const paymentService = new TicketPaymentService();
		let result;

		try {
			paymentService.makePayment(accountId, costToPay);
			result = true;
		} catch (_error) {
			result = false;
		}

		return result;
	}

	#reserveSeats(accountId, seats) {
		const reservationService = new SeatReservationService();
		let result;

		try {
			reservationService.reserveSeat(accountId, seats);
			result = true;
		} catch (_error) {
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
      throw new InvalidPurchaseException(`${totalTickets} too many, max is 25`);
    }

    if (!this.#isRequestValid(ticketTypeRequests)) {
      throw new InvalidPurchaseException('Not enough adults for number of children/infants');
    }

		const {cost, seats} = this.#calculatePriceAndSeats(ticketTypeRequests);

		/* Ensure that the seat reservation succeeds before charging customer */
		return this.#reserveSeats(accountId, seats) && this.#payCost(accountId, cost);
	}
}
