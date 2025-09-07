import { describe, it, expect, afterAll, beforeAll, jest } from '@jest/globals';
import * as auth from '../../src/lib/auth';
import { APIUser, User, WithId } from '../../src/types/types';
import { addUser, deleteFirestoreUser } from '../../src/repositories/userRepository';
import { Role } from '../../src/types/enums';
import { CreateRequest, getAuth } from 'firebase-admin/auth';

const timeout = 1000 * 10
const testUid = 'authlibtest'
const testFirestore: User = {
            username: 'test',
            role: Role.USER,
            is_banned: false
        }

const testAuth: CreateRequest = {
            uid: testUid,
            displayName: 'test',
            email: 'test@example.com',
            disabled: false,
            password: 'Test@12'
        }

const testAPIUser: WithId<APIUser> = {
            id: testAuth.uid!,
            user: {
                username: testFirestore.username,
                is_banned: testFirestore.is_banned,
                role: testFirestore.role
            },
            details: {
                photo_url: '',
                disabled: testAuth.disabled!,
                email: testAuth.email,
                displayName: testAuth.displayName!
            }
        }

describe('auth lib (integration)', () => {

    beforeAll(async () => {
        await addUser(testFirestore, testUid);
        await getAuth().createUser(testAuth)
    }, timeout)

    afterAll(async () => {
        await deleteFirestoreUser(testUid)
        await getAuth().deleteUser(testUid)
    }, timeout)

    describe('getAuthUserBy (id or email)', () => {
        it('should retrieve user with its details when getting auth user by id', async () => {
            const result = await auth.getAuthUserById(testUid);
            expect(result && result.id && result.user && result.details).toBeDefined();
            
            expect(result).toStrictEqual(testAPIUser)
        }, timeout);

        it('should return null if id of auth user is not found', async () => {
            const result = await auth.getAuthUserById('fake');
            expect(result).toBeNull();
        }, timeout);

        it('should retrieve user with its details when getting auth user by email', async () => {
            const result = await auth.getAuthUserByEmail(testAuth.email!);
            expect(result && result.id && result.user && result.details).toBeDefined();
            expect(result).toStrictEqual(testAPIUser)
        }, timeout)

        it('should return null if email of auth user is not found', async () => {
            const result = await auth.getAuthUserByEmail('fake@example.com');
            expect(result).toBeNull();
        }, timeout);
    })

    describe('verify (cookie or token)', () => {
        it('should return user when verifying token', async () => {
            jest.spyOn(getAuth(), 'verifyIdToken').mockImplementation(async () => ({ uid: testAPIUser.id } as any));
            const result = await auth.verifyToken('fake-token');
            expect(result).toStrictEqual(testAPIUser);
        }, timeout)

        it('should return user when verifying cookie', async () => {
            jest.spyOn(getAuth(), 'verifySessionCookie').mockImplementation(async () => ({ uid: testAPIUser.id } as any));
            const result = await auth.verifyCookie('fake-cookie');
            expect(result).toStrictEqual(testAPIUser);
        }, timeout)
    })
});