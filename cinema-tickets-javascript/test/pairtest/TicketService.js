import TicketTypeRequest from '../../src/pairtest/lib/TicketTypeRequest.js';
import TicketService from '../../src/pairtest/TicketService.js';
import {deepEqual, equal} from 'assert';
import sinon from 'sinon';
import TicketPaymentService from '../../src/thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../../src/thirdparty/seatbooking/SeatReservationService.js';

const seatStub = sinon.stub(SeatReservationService.prototype, 'reserveSeat');
const paymentStub = sinon.stub(TicketPaymentService.prototype, 'makePayment');

afterEach(() => {
	seatStub.reset();
	paymentStub.reset();
});

describe('makePayment', () => {
	describe('when all values are valid', () => {
		it('should call the makePayment function with the correct args', () => {
			const ticket = new TicketService();
			deepEqual(ticket.purchaseTickets(1, new TicketTypeRequest('ADULT', 1)), true);
			deepEqual(paymentStub.getCalls()[0].args, [1, 25]);
			equal(paymentStub.getCalls().length, 1);
		});

		it('should call the reserve seats function with the correct args', () => {
			const ticket = new TicketService();
			deepEqual(ticket.purchaseTickets(1, new TicketTypeRequest('ADULT', 1)), true);
			deepEqual(seatStub.getCalls()[0].args, [1, 1]);
			equal(seatStub.getCalls().length, 1);
		});
	});

	describe('when accountId is invalid', () => {
		it('should throw an error when the account ID is less than 1', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(0, new TicketTypeRequest('CHILD', 1), true);
			} catch (e) {
				error = e;
			}

			equal(paymentStub.getCalls().length, 0);
			equal(error.message, 'Invalid account ID 0');
		});

		it('should throw an error when the account ID is not a number', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets('hello', new TicketTypeRequest('CHILD', 1), true);
			} catch (e) {
				error = e;
			}

			equal(seatStub.getCalls().length, 0);
			equal(error.message, 'Invalid account ID hello');
		});
	});
});
