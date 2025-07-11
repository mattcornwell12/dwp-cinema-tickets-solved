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
            deepEqual(seatStub.getCalls()[0].args, [1, 1]);
			equal(paymentStub.getCalls().length, 1);
		});

        it('should call the makePayment function with the correct args when there are many adults', () => {
			const ticket = new TicketService();
			deepEqual(
                ticket.purchaseTickets(
                    1, 
                    new TicketTypeRequest('ADULT', 14),
                    new TicketTypeRequest('ADULT', 2),
                    new TicketTypeRequest('CHILD', 2),
                    new TicketTypeRequest('INFANT', 2)
                ), 
                true
            );

			deepEqual(paymentStub.getCalls()[0].args, [1, 420]);
            deepEqual(seatStub.getCalls()[0].args, [1, 18]);
			equal(paymentStub.getCalls().length, 1);
		});
	});

	describe('when accountId is invalid', () => {
		it('should throw an error when the account ID is less than 1', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(0, new TicketTypeRequest('ADULT', 1));
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
				ticket.purchaseTickets('hello', new TicketTypeRequest('ADULT', 1));
			} catch (e) {
				error = e;
			}

			equal(seatStub.getCalls().length, 0);
			equal(error.message, 'Invalid account ID hello');
		});
	});

    describe('when reserveseat throws an error', () => {
		it('returns false and doesnt attempt to take payment', () => {
			const ticket = new TicketService();
            seatStub.throwsException({ message: 'Broken' });
			const result = ticket.purchaseTickets(1, new TicketTypeRequest('ADULT', 1));

			equal(paymentStub.getCalls().length, 0);
			equal(result, false);
		});
	});

    describe('when taking payment throws an error', () => {
		it('returns false and doesnt attempt to take payment', () => {
			const ticket = new TicketService();
            paymentStub.throwsException({ message: 'Broken' });
			const result = ticket.purchaseTickets(1, new TicketTypeRequest('ADULT', 1));

			equal(paymentStub.getCalls().length, 1);
			equal(result, false);
		});
	});

	describe('when there are too many tickets requested', () => {
		it('should throw an error', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(1, new TicketTypeRequest('ADULT', 20), new TicketTypeRequest('CHILD', 6));
			} catch (e) {
				error = e;
			}

			equal(paymentStub.getCalls().length, 0);
			equal(error.message, '26 invalid, needs to be between 1 and 25');
		});
	});

	describe('when there are not enough tickets requested', () => {
		it('should throw an error', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(1);
			} catch (e) {
				error = e;
			}

			equal(paymentStub.getCalls().length, 0);
			equal(error.message, '0 invalid, needs to be between 1 and 25');
		});
	});

	describe('when there are not enough adults for the children', () => {
		it('should throw an error if there is no adult', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(1, new TicketTypeRequest('CHILD', 6));
			} catch (e) {
				error = e;
			}

			equal(paymentStub.getCalls().length, 0);
			equal(error.message, 'Not enough adults for number of children/infants');
		});

		it('should throw an error if there are not enough adults for all infants', () => {
			const ticket = new TicketService();
			let error;

			try {
				ticket.purchaseTickets(
                    1, 
                    new TicketTypeRequest('ADULT', 2), 
                    new TicketTypeRequest('INFANT', 2), 
                    new TicketTypeRequest('INFANT', 1)
                );
			} catch (e) {
				error = e;
			}

			equal(paymentStub.getCalls().length, 0);
			equal(error.message, 'Not enough adults for number of children/infants');
		});
	});
});
