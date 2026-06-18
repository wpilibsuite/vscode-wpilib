#
# Copyright (c) FIRST and other WPILib contributors.
# Open Source Software; you can modify and/or share it under the terms of
# the WPILib BSD license file in the root directory of this project.
#

"""
    This autonomous mode doesn't do anything particularly useful, it's just
    here to test out features and make sure that things work.
    The motors will timeout  if you do not set them to 0.
"""

from robotpy_ext.autonomous import StatefulAutonomous, state, timed_state


class FeatureExample(StatefulAutonomous):
    MODE_NAME = "Feature Example"

    def initialize(self):
        self.initial_called = None

    #
    # Weird argument combinations are supported
    #

    @state(first=True)
    def first(self):
        self.next_state("weird0")

    @timed_state(duration=0.5, next_state="weird1")
    def weird0(self):
        pass

    @timed_state(duration=0.5, next_state="weird2")
    def weird1(self, tm):
        pass

    @timed_state(duration=0.5, next_state="weird3")
    def weird2(self, state_tm):
        pass

    @timed_state(duration=0.5, next_state="weird4")
    def weird3(self, state_tm, tm):
        pass

    @timed_state(duration=0.5, next_state="initial_call_test")
    def weird4(self, tm, state_tm):
        pass

    @state()
    def weird5(self, tm):
        # Just make sure the timing mechanism works
        assert int(tm) == 2
        self.next_state("initial_call_test")

    @state()
    def initial_call_test(self, initial_call):
        if initial_call:
            assert self.initial_called is None
            self.initial_called = True
        else:
            assert self.initial_called == True
            self.next_state("none1")

    @state()
    def none1(self, initial_call):
        self.done()

    # Run for N number of iterations

    # Just do something until something changes

    # @state()

    # sdef
