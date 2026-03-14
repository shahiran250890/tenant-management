<?php

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

uses(TestCase::class);

test('login page does not offer registration when registration is disabled', function () {
    /** @var TestCase $this */
    $response = $this->get(route('login'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/login')
        ->has('canResetPassword')
        ->missing('canRegister')
    );
});
