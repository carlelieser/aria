import { describe, it, expect } from 'vitest';
import { Duration } from '@domain/value-objects/duration';

describe('Duration', () => {
	describe('Factory Methods', () => {
		describe('fromMilliseconds', () => {
			it('should create duration from positive milliseconds', () => {
				const duration = Duration.fromMilliseconds(5000);
				expect(duration.totalMilliseconds).toBe(5000);
			});

			it('should clamp negative values to zero', () => {
				const duration = Duration.fromMilliseconds(-1000);
				expect(duration.totalMilliseconds).toBe(0);
			});

			it('should round fractional milliseconds', () => {
				const duration = Duration.fromMilliseconds(1500.7);
				expect(duration.totalMilliseconds).toBe(1501);
			});

			it('should handle zero', () => {
				const duration = Duration.fromMilliseconds(0);
				expect(duration.totalMilliseconds).toBe(0);
			});
		});

		describe('fromSeconds', () => {
			it('should convert seconds to milliseconds', () => {
				const duration = Duration.fromSeconds(5);
				expect(duration.totalMilliseconds).toBe(5000);
			});

			it('should handle fractional seconds', () => {
				const duration = Duration.fromSeconds(2.5);
				expect(duration.totalMilliseconds).toBe(2500);
			});
		});

		describe('fromMinutes', () => {
			it('should convert minutes to milliseconds', () => {
				const duration = Duration.fromMinutes(2);
				expect(duration.totalMilliseconds).toBe(120000);
			});

			it('should handle fractional minutes', () => {
				const duration = Duration.fromMinutes(1.5);
				expect(duration.totalMilliseconds).toBe(90000);
			});
		});

		describe('fromHMS', () => {
			it('should create duration from hours, minutes, seconds', () => {
				const duration = Duration.fromHMS(1, 30, 45);
				expect(duration.totalMilliseconds).toBe(5445000);
			});

			it('should handle zero values', () => {
				const duration = Duration.fromHMS(0, 0, 30);
				expect(duration.totalMilliseconds).toBe(30000);
			});
		});

		describe('ZERO singleton', () => {
			it('should have zero milliseconds', () => {
				expect(Duration.ZERO.totalMilliseconds).toBe(0);
			});

			it('should be frozen', () => {
				expect(Object.isFrozen(Duration.ZERO)).toBe(true);
			});
		});
	});

	describe('Parsing', () => {
		describe('parse', () => {
			it('should parse MM:SS format', () => {
				const duration = Duration.parse('3:45');
				expect(duration.totalSeconds).toBe(225);
			});

			it('should parse HH:MM:SS format', () => {
				const duration = Duration.parse('1:30:45');
				expect(duration.totalSeconds).toBe(5445);
			});

			it('should parse with leading zeros', () => {
				const duration = Duration.parse('03:05');
				expect(duration.minutes).toBe(3);
				expect(duration.seconds).toBe(5);
			});

			it('should throw on invalid format with single part', () => {
				expect(() => Duration.parse('123')).toThrow('Invalid duration format');
			});

			it('should throw on invalid characters', () => {
				expect(() => Duration.parse('3:ab')).toThrow('Invalid duration format');
			});

			it('should throw on empty string', () => {
				expect(() => Duration.parse('')).toThrow('Invalid duration format');
			});

			it('should throw on four parts', () => {
				expect(() => Duration.parse('1:2:3:4')).toThrow('Invalid duration format');
			});
		});

		describe('tryParse', () => {
			it('should return duration on valid input', () => {
				const duration = Duration.tryParse('3:45');
				expect(duration).not.toBeNull();
				expect(duration?.totalSeconds).toBe(225);
			});

			it('should return null on invalid input', () => {
				const duration = Duration.tryParse('invalid');
				expect(duration).toBeNull();
			});
		});
	});

	describe('Component Getters', () => {
		const duration = Duration.fromHMS(2, 35, 48);

		it('should return correct hours', () => {
			expect(duration.hours).toBe(2);
		});

		it('should return correct minutes within hour', () => {
			expect(duration.minutes).toBe(35);
		});

		it('should return correct seconds within minute', () => {
			expect(duration.seconds).toBe(48);
		});

		it('should return correct total hours', () => {
			expect(duration.totalHours).toBe(2);
		});

		it('should return correct total minutes', () => {
			expect(duration.totalMinutes).toBe(155);
		});

		it('should return correct total seconds', () => {
			expect(duration.totalSeconds).toBe(9348);
		});

		describe('milliseconds', () => {
			it('should return milliseconds component', () => {
				const durationWithMs = Duration.fromMilliseconds(5500);
				expect(durationWithMs.milliseconds).toBe(500);
			});
		});
	});

	describe('Formatting', () => {
		describe('format', () => {
			it('should format without hours when under one hour', () => {
				const duration = Duration.fromSeconds(185);
				expect(duration.format()).toBe('3:05');
			});

			it('should format with hours when over one hour', () => {
				const duration = Duration.fromSeconds(3725);
				expect(duration.format()).toBe('1:02:05');
			});

			it('should format zero duration', () => {
				expect(Duration.ZERO.format()).toBe('0:00');
			});

			it('should pad seconds with leading zero', () => {
				const duration = Duration.fromSeconds(65);
				expect(duration.format()).toBe('1:05');
			});
		});

		describe('formatLong', () => {
			it('should always include hours with padding', () => {
				const duration = Duration.fromSeconds(65);
				expect(duration.formatLong()).toBe('00:01:05');
			});

			it('should pad all components', () => {
				const duration = Duration.fromHMS(1, 2, 3);
				expect(duration.formatLong()).toBe('01:02:03');
			});
		});

		describe('formatHuman', () => {
			it('should format hours and minutes', () => {
				const duration = Duration.fromHMS(2, 30, 0);
				expect(duration.formatHuman()).toBe('2 hr 30 min');
			});

			it('should include seconds when present', () => {
				const duration = Duration.fromSeconds(90);
				expect(duration.formatHuman()).toBe('1 min 30 sec');
			});

			it('should show only seconds for short durations', () => {
				const duration = Duration.fromSeconds(45);
				expect(duration.formatHuman()).toBe('45 sec');
			});

			it('should show 0 sec for zero duration', () => {
				expect(Duration.ZERO.formatHuman()).toBe('0 sec');
			});

			it('should omit zero components in middle', () => {
				const duration = Duration.fromHMS(1, 0, 30);
				expect(duration.formatHuman()).toBe('1 hr 30 sec');
			});
		});
	});

	describe('Arithmetic Operations', () => {
		describe('add', () => {
			it('should add two durations', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(30);
				expect(d1.add(d2).totalSeconds).toBe(90);
			});

			it('should handle adding zero', () => {
				const duration = Duration.fromSeconds(60);
				expect(duration.add(Duration.ZERO).totalSeconds).toBe(60);
			});
		});

		describe('subtract', () => {
			it('should subtract durations', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(30);
				expect(d1.subtract(d2).totalSeconds).toBe(30);
			});

			it('should clamp to zero when result would be negative', () => {
				const d1 = Duration.fromSeconds(30);
				const d2 = Duration.fromSeconds(60);
				expect(d1.subtract(d2).totalSeconds).toBe(0);
			});
		});

		describe('multiply', () => {
			it('should multiply duration by factor', () => {
				const duration = Duration.fromSeconds(60);
				expect(duration.multiply(2).totalSeconds).toBe(120);
			});

			it('should handle fractional factors', () => {
				const duration = Duration.fromSeconds(60);
				expect(duration.multiply(0.5).totalSeconds).toBe(30);
			});

			it('should handle negative factor by clamping to zero', () => {
				const duration = Duration.fromSeconds(60);
				expect(duration.multiply(-1).totalSeconds).toBe(0);
			});
		});
	});

	describe('Comparison Operations', () => {
		describe('equals', () => {
			it('should return true for equal durations', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(60);
				expect(d1.equals(d2)).toBe(true);
			});

			it('should return false for different durations', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(61);
				expect(d1.equals(d2)).toBe(false);
			});
		});

		describe('greaterThan', () => {
			it('should return true when greater', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(30);
				expect(d1.greaterThan(d2)).toBe(true);
			});

			it('should return false when equal', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(60);
				expect(d1.greaterThan(d2)).toBe(false);
			});

			it('should return false when less', () => {
				const d1 = Duration.fromSeconds(30);
				const d2 = Duration.fromSeconds(60);
				expect(d1.greaterThan(d2)).toBe(false);
			});
		});

		describe('lessThan', () => {
			it('should return true when less', () => {
				const d1 = Duration.fromSeconds(30);
				const d2 = Duration.fromSeconds(60);
				expect(d1.lessThan(d2)).toBe(true);
			});

			it('should return false when equal', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(60);
				expect(d1.lessThan(d2)).toBe(false);
			});

			it('should return false when greater', () => {
				const d1 = Duration.fromSeconds(60);
				const d2 = Duration.fromSeconds(30);
				expect(d1.lessThan(d2)).toBe(false);
			});
		});

		describe('isZero', () => {
			it('should return true for zero duration', () => {
				expect(Duration.ZERO.isZero()).toBe(true);
			});

			it('should return false for non-zero duration', () => {
				expect(Duration.fromSeconds(1).isZero()).toBe(false);
			});
		});
	});

	describe('Serialization', () => {
		describe('toString', () => {
			it('should return formatted string', () => {
				const duration = Duration.fromSeconds(185);
				expect(duration.toString()).toBe('3:05');
			});
		});

		describe('toJSON', () => {
			it('should return total milliseconds', () => {
				const duration = Duration.fromSeconds(60);
				expect(duration.toJSON()).toBe(60000);
			});

			it('should serialize correctly with JSON.stringify', () => {
				const duration = Duration.fromSeconds(60);
				const json = JSON.stringify({ duration });
				expect(json).toBe('{"duration":60000}');
			});
		});
	});

	describe('Immutability', () => {
		it('should be frozen', () => {
			const duration = Duration.fromSeconds(60);
			expect(Object.isFrozen(duration)).toBe(true);
		});

		it('should not allow modification', () => {
			const duration = Duration.fromSeconds(60);
			expect(() => {
				(duration as { totalMilliseconds: number }).totalMilliseconds = 0;
			}).toThrow();
		});
	});
});
